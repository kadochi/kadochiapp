(function () {
  "use strict";

  var config = window.KadochiSupportAdmin;
  var quickReplyConfig = window.KadochiSupportQuickReplies;
  var root = document.getElementById("kadochi-support-app");
  if (!config || !root) return;

  var state = { page: 1, selected: null, list: null, detail: null, messages: [], messagePage: null, agents: [], busy: false, drafts: Object.create(null), newMessageCount: 0, detailRequest: 0, queuePolling: false, detailPolling: false };
  var filters = { search: "", status: "", assigned_admin_id: "", date_from: "", date_to: "" };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === "className") node.className = attrs[key];
      else if (key === "text") node.textContent = attrs[key];
      else if (key.indexOf("on") === 0) node.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
      else if (attrs[key] !== null && attrs[key] !== undefined) node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) { if (child) node.appendChild(child); });
    return node;
  }

  function api(path, options) {
    options = options || {};
    return fetch(config.root + path, {
      method: options.method || "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-WP-Nonce": config.nonce },
      body: options.body ? JSON.stringify(options.body) : undefined
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        if (!response.ok) { var error = new Error(body.message || "Request failed."); error.status = response.status; throw error; }
        return body;
      });
    });
  }

  function formatDate(value) {
    if (!value) return "—";
    try { return new Intl.DateTimeFormat(document.documentElement.lang || "en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
    catch (_) { return value; }
  }

  function showError(error) {
    var notice = el("div", { className: "notice notice-error inline", role: "alert" }, [el("p", { text: error.message || "Request failed." })]);
    root.prepend(notice);
    window.setTimeout(function () { notice.remove(); }, 6000);
  }

  function operationId() { return window.crypto && crypto.randomUUID ? crypto.randomUUID() : "00000000-0000-4000-8000-" + Date.now().toString().padStart(12, "0").slice(-12); }

  function preserveComposerDraft() {
    var textarea = root.querySelector("[data-support-reply]");
    var section = textarea && textarea.closest("[data-conversation-id]");
    var conversationId = section && section.getAttribute("data-conversation-id");
    if (textarea && conversationId) state.drafts[conversationId] = textarea.value;
  }

  function sameMessages(left, right) {
    if (left.length !== right.length) return false;
    return left.every(function (message, index) {
      var other = right[index];
      return other && message.id === other.id && message.body === other.body && message.readAt === other.readAt && message.createdAt === other.createdAt;
    });
  }

  function loadList(background) {
    var query = new URLSearchParams({ page: String(state.page), per_page: "20" });
    Object.keys(filters).forEach(function (key) { if (filters[key]) query.set(key, filters[key]); });
    return api("/conversations?" + query).then(function (data) {
      var changed = !state.list || JSON.stringify(state.list) !== JSON.stringify(data);
      state.list = data; state.agents = data.agents || state.agents;
      if (background) { if (changed) updateQueueInPlace(); } else render();
      if (!state.selected && data.items && data.items.length) selectConversation(data.items[0].id);
    }).catch(showError);
  }

  function selectConversation(id, background) {
    var changed = state.selected !== id;
    var previousMessages = changed ? [] : state.messages.slice();
    var requestId = ++state.detailRequest;
    state.selected = id;
    if (changed) { state.detail = null; state.messages = []; state.messagePage = null; state.newMessageCount = 0; render(); }
    return Promise.all([api("/conversations/" + id), api("/conversations/" + id + "/messages?per_page=50")])
      .then(function (values) {
        if (state.selected !== id || requestId !== state.detailRequest) return;
        var known = new Set(previousMessages.map(function (message) { return message.id; }));
        var nextMessages = values[1].items || [];
        var incoming = background ? nextMessages.filter(function (message) { return message.senderRole === "customer" && !known.has(message.id); }).length : 0;
        var messagesChanged = !sameMessages(previousMessages, nextMessages);
        state.detail = values[0].conversation; state.agents = values[0].agents || state.agents; state.messages = nextMessages; state.messagePage = values[1]; state.newMessageCount += incoming;
        if (background) updateDetailInPlace(messagesChanged ? "background" : null); else render();
        var customerMessages = state.messages.filter(function (message) { return message.senderRole === "customer" && !message.readAt; });
        if (customerMessages.length) api("/conversations/" + id + "/read", { method: "POST", body: { throughMessageId: customerMessages[customerMessages.length - 1].id } }).then(function () { loadList(true); }).catch(function () {});
      }).catch(showError);
  }

  function updateConversation(patch) {
    if (!state.detail || state.busy) return;
    state.busy = true;
    api("/conversations/" + state.detail.id, { method: "PATCH", body: Object.assign({ version: state.detail.version }, patch) })
      .then(function (data) { state.detail = data.conversation; state.busy = false; updateDetailControls(); return loadList(true); })
      .catch(function (error) { state.busy = false; showError(error); updateDetailControls(); if (error.status === 409) selectConversation(state.selected, true); });
  }

  function loadOlderMessages() {
    if (!state.detail || !state.messagePage || !state.messagePage.hasMore || !state.messagePage.oldestCursor) return;
    api("/conversations/" + state.detail.id + "/messages?per_page=50&before=" + encodeURIComponent(state.messagePage.oldestCursor)).then(function (page) {
      var known = new Set(state.messages.map(function (message) { return message.id; }));
      state.messages = page.items.filter(function (message) { return !known.has(message.id); }).concat(state.messages);
      state.messagePage = Object.assign({}, state.messagePage, { hasMore: page.hasMore, oldestCursor: page.oldestCursor });
      updateHistoryInPlace("older");
    }).catch(showError);
  }

  function sendReply(textarea) {
    var body = textarea.value.trim();
    if (!body || state.busy || !state.detail) return;
    var conversationId = state.detail.id;
    state.busy = true; textarea.disabled = true;
    api("/conversations/" + conversationId + "/messages", { method: "POST", body: { body: body, operationId: operationId() } })
      .then(function (message) { state.messages.push(message); delete state.drafts[conversationId]; textarea.value = ""; textarea.disabled = false; state.busy = false; updateHistoryInPlace("append"); textarea.focus(); loadList(true); return selectConversation(conversationId, true); })
      .catch(function (error) { state.busy = false; textarea.disabled = false; showError(error); });
  }

  function filterField(label, key, type) {
    var input = el("input", { type: type || "text", value: filters[key], "aria-label": label });
    input.addEventListener("change", function () { filters[key] = input.value; state.page = 1; loadList(); });
    return input;
  }

  function renderFilters() {
    var status = el("select", { "aria-label": "Status" }, [el("option", { value: "", text: "All statuses" }), el("option", { value: "open", text: "Open" }), el("option", { value: "pending", text: "Pending" }), el("option", { value: "closed", text: "Closed" })]);
    status.value = filters.status; status.addEventListener("change", function () { filters.status = status.value; state.page = 1; loadList(); });
    var assigned = el("select", { "aria-label": "Assignment" }, [el("option", { value: "", text: "All agents" }), el("option", { value: "unassigned", text: "Unassigned" })]);
    state.agents.forEach(function (agent) { assigned.appendChild(el("option", { value: String(agent.id), text: agent.displayName })); });
    assigned.value = filters.assigned_admin_id; assigned.addEventListener("change", function () { filters.assigned_admin_id = assigned.value; state.page = 1; loadList(); });
    var search = filterField("Search customer", "search", "search"); search.placeholder = "Search name, email, or phone";
    return el("div", { className: "kadochi-support-filters" }, [search, status, assigned, filterField("From date", "date_from", "date"), filterField("To date", "date_to", "date")]);
  }

  function renderList() {
    if (!state.list) return el("p", { text: "Loading conversations…" });
    var list = el("div", { className: "kadochi-support-list", role: "list" });
    if (!state.list.items.length) list.appendChild(el("p", { className: "kadochi-support-empty", text: "No conversations match these filters." }));
    state.list.items.forEach(function (conversation) {
      var button = el("button", { type: "button", className: "kadochi-support-list-item" + (state.selected === conversation.id ? " is-selected" : ""), onclick: function () { selectConversation(conversation.id, state.selected === conversation.id); } }, [
        el("strong", { text: conversation.displayName }),
        el("span", { text: conversation.status + " · " + formatDate(conversation.lastMessageAt) }),
        conversation.unreadCount ? el("b", { className: "kadochi-support-unread", text: String(conversation.unreadCount), "aria-label": conversation.unreadCount + " unread" }) : null
      ]);
      list.appendChild(button);
    });
    var pager = el("div", { className: "kadochi-support-pager" }, [
      el("button", { type: "button", className: "button", disabled: state.page <= 1 ? "disabled" : null, onclick: function () { state.page--; loadList(); }, text: "Previous" }),
      el("span", { text: "Page " + state.list.page + " of " + Math.max(1, state.list.totalPages) }),
      el("button", { type: "button", className: "button", disabled: state.page >= state.list.totalPages ? "disabled" : null, onclick: function () { state.page++; loadList(); }, text: "Next" })
    ]);
    return el("div", {}, [list, pager]);
  }

  function updateQueueInPlace() {
    var host = root.querySelector("[data-support-queue]");
    // A background queue refresh must never recreate the detail pane or its
    // composer. A later poll will update the queue once the initial UI exists.
    if (!host) return;
    host.replaceChildren(renderList());
  }

  function fillHistory(history) {
    if (state.messagePage && state.messagePage.hasMore) history.appendChild(el("li", { className: "kadochi-support-load-older" }, [el("button", { type: "button", className: "button", onclick: loadOlderMessages, text: "Load older messages" })]));
    if (!state.messages.length) history.appendChild(el("li", { className: "kadochi-support-empty", text: "No messages yet." }));
    state.messages.forEach(function (message) { history.appendChild(el("li", { className: "kadochi-support-message is-" + message.senderRole }, [el("p", { text: message.body }), el("time", { datetime: message.createdAt, text: formatDate(message.createdAt) })])); });
  }

  function updateNewMessageIndicator() {
    var indicator = root.querySelector("[data-support-new-messages]");
    if (!indicator) return;
    indicator.replaceChildren();
    if (!state.newMessageCount) return;
    indicator.appendChild(el("button", { type: "button", className: "button kadochi-support-new-message-button", onclick: function () {
      var history = root.querySelector(".kadochi-support-history");
      if (history) history.scrollTop = history.scrollHeight;
      state.newMessageCount = 0;
      updateNewMessageIndicator();
    }, text: state.newMessageCount + (state.newMessageCount === 1 ? " new message" : " new messages") }));
  }

  function updateHistoryInPlace(mode) {
    var history = root.querySelector(".kadochi-support-history");
    if (!history) return;
    var previousHeight = history.scrollHeight;
    var previousTop = history.scrollTop;
    var nearBottom = previousHeight - previousTop - history.clientHeight < 80;
    history.replaceChildren();
    fillHistory(history);
    if (mode === "older") history.scrollTop = previousTop + (history.scrollHeight - previousHeight);
    else if (nearBottom || mode === "append") history.scrollTop = history.scrollHeight;
    else history.scrollTop = previousTop;
    updateNewMessageIndicator();
  }

  function updateDetailControls() {
    if (!state.detail) return;
    var section = root.querySelector("[data-support-detail]");
    if (!section || section.getAttribute("data-conversation-id") !== state.detail.id) return;
    var status = section.querySelector("[data-support-status]");
    var assigned = section.querySelector("[data-support-assigned]");
    var heading = section.querySelector("[data-support-heading]");
    var meta = section.querySelector("[data-support-meta]");
    if (status) { status.value = state.detail.status; status.disabled = state.busy; }
    if (assigned) { assigned.value = state.detail.assignedAdminId ? String(state.detail.assignedAdminId) : ""; assigned.disabled = state.busy; }
    if (heading) heading.textContent = state.detail.displayName;
    if (meta) meta.textContent = [state.detail.ownerType, state.detail.email, state.detail.phone].filter(Boolean).join(" · ") || "No contact details";
  }

  function updateDetailInPlace(mode) {
    var section = root.querySelector("[data-support-detail]");
    // Polling is deliberately partial. If the operator changed conversations
    // while a request was in flight, ignore this result instead of replacing
    // the whole app and destroying the live reply field.
    if (!state.detail || !section || section.getAttribute("data-conversation-id") !== state.detail.id) return;
    updateDetailControls();
    if (mode) updateHistoryInPlace(mode);
    else updateNewMessageIndicator();
  }

  function renderDetail() {
    if (!state.selected) return el("section", { className: "kadochi-support-detail kadochi-support-empty", text: "Select a conversation." });
    if (!state.detail) return el("section", { className: "kadochi-support-detail", text: "Loading conversation…" });
    var status = el("select", { "aria-label": "Conversation status", "data-support-status": "", disabled: state.busy ? "disabled" : null });
    ["open", "pending", "closed"].forEach(function (value) { status.appendChild(el("option", { value: value, text: value.charAt(0).toUpperCase() + value.slice(1) })); });
    status.value = state.detail.status; status.addEventListener("change", function () { updateConversation({ status: status.value }); });
    var assigned = el("select", { "aria-label": "Assigned agent", "data-support-assigned": "", disabled: state.busy ? "disabled" : null }, [el("option", { value: "", text: "Unassigned" })]);
    state.agents.forEach(function (agent) { assigned.appendChild(el("option", { value: String(agent.id), text: agent.displayName })); });
    assigned.value = state.detail.assignedAdminId ? String(state.detail.assignedAdminId) : "";
    assigned.addEventListener("change", function () { updateConversation({ assignedAdminId: assigned.value ? Number(assigned.value) : null }); });
    var header = el("header", { className: "kadochi-support-detail-header" }, [
      el("div", {}, [el("h2", { text: state.detail.displayName, "data-support-heading": "" }), el("p", { text: [state.detail.ownerType, state.detail.email, state.detail.phone].filter(Boolean).join(" · ") || "No contact details", "data-support-meta": "" })]),
      el("div", { className: "kadochi-support-controls" }, [status, assigned])
    ]);
    var newMessages = el("div", { className: "kadochi-support-new-messages", "data-support-new-messages": "", "aria-live": "polite" });
    var history = el("ol", { className: "kadochi-support-history", "aria-label": "Message history" });
    fillHistory(history);
    var conversationId = state.detail.id;
    var textarea = el("textarea", { rows: "3", maxlength: "2000", placeholder: "Write a reply…", "aria-label": "Reply", "data-support-reply": "" });
    textarea.value = state.drafts[conversationId] || "";
    textarea.addEventListener("input", function () { state.drafts[conversationId] = textarea.value; });
    textarea.addEventListener("keydown", function (event) { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendReply(textarea); } });
    var composerChildren = [];
    if (quickReplyConfig && quickReplyConfig.items && quickReplyConfig.items.length) {
      var menuId = "kadochi-support-quick-replies";
      var insertionPoint = textarea.value.length;
      var menu = el("div", { id: menuId, className: "kadochi-support-quick-replies-menu", role: "menu", dir: "rtl", hidden: "hidden" });
      var toggle = el("button", { type: "button", className: "button kadochi-support-quick-replies-toggle", "aria-haspopup": "menu", "aria-controls": menuId, "aria-expanded": "false", text: "پاسخ‌های آماده" });

      function closeQuickReplies() {
        menu.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
      }

      toggle.addEventListener("click", function () {
        insertionPoint = typeof textarea.selectionStart === "number" ? textarea.selectionStart : textarea.value.length;
        menu.hidden = !menu.hidden;
        toggle.setAttribute("aria-expanded", menu.hidden ? "false" : "true");
        if (!menu.hidden && menu.firstElementChild) menu.firstElementChild.focus();
      });
      menu.addEventListener("keydown", function (event) {
        if (event.key === "Escape") { event.preventDefault(); closeQuickReplies(); toggle.focus(); }
      });
      quickReplyConfig.items.forEach(function (reply) {
        menu.appendChild(el("button", { type: "button", className: "kadochi-support-quick-reply", role: "menuitem", onclick: function () {
          var result = quickReplyConfig.insert(textarea.value, reply.message, insertionPoint);
          textarea.value = result.value;
          state.drafts[conversationId] = result.value;
          closeQuickReplies();
          textarea.focus();
          textarea.setSelectionRange(result.caret, result.caret);
        } }, [el("strong", { text: reply.label }), el("span", { text: reply.message })]));
      });
      composerChildren.push(el("div", { className: "kadochi-support-composer-actions" }, [el("div", { className: "kadochi-support-quick-replies" }, [toggle, menu])]));
    }
    composerChildren.push(textarea, el("button", { type: "button", className: "button button-primary", onclick: function () { sendReply(textarea); }, text: "Send reply" }));
    var composer = el("div", { className: "kadochi-support-composer" }, composerChildren);
    var section = el("section", { className: "kadochi-support-detail", "data-support-detail": "", "data-conversation-id": state.detail.id }, [header, newMessages, history, composer]);
    window.requestAnimationFrame(function () { history.scrollTop = history.scrollHeight; updateNewMessageIndicator(); });
    return section;
  }

  function render() {
    preserveComposerDraft();
    root.replaceChildren(renderFilters(), el("div", { className: "kadochi-support-grid" }, [el("aside", { "data-support-queue": "" }, [renderList()]), renderDetail()]));
  }

  loadList();
  window.setInterval(function () {
    if (document.hidden || state.queuePolling) return;
    state.queuePolling = true;
    loadList(true).finally(function () { state.queuePolling = false; });
  }, 10000);
  window.setInterval(function () {
    if (document.hidden || !state.selected || state.busy || state.detailPolling) return;
    state.detailPolling = true;
    selectConversation(state.selected, true).finally(function () { state.detailPolling = false; });
  }, 5000);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) return;
    if (!state.queuePolling) {
      state.queuePolling = true;
      loadList(true).finally(function () { state.queuePolling = false; });
    }
    if (state.selected && !state.busy && !state.detailPolling) {
      state.detailPolling = true;
      selectConversation(state.selected, true).finally(function () { state.detailPolling = false; });
    }
  });
}());
