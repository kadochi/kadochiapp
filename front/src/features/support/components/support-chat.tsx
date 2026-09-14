"use client";

import Image from "next/image";
import { Dialog } from "radix-ui";
import { ChevronUp, MessageCircle, RefreshCw, Send, WifiOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextArea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/auth-provider";
import { ServiceError } from "@/lib/http/errors";
import { claimGuestConversation, createConversation, getConversation, getCurrentConversation, listMessages, markRead, sendMessage } from "../services/support";
import type { SupportConversation as ConversationType, SupportMessage as MessageType } from "../types";

type LocalMessage = MessageType & { delivery?: "sending" | "failed"; operationId?: string };

export const SUPPORT_AGENT = {
  name: "نازنین احمدی",
  avatar: "/images/support-agent-nazanin.png",
} as const;
export const SUPPORT_GREETING = "چطور می‌تونم کمکتون کنم؟";

export function mergeMessages(current: LocalMessage[], incoming: LocalMessage[]): LocalMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function ChatStatus({ online, error, onRetry }: { online: boolean; error: Error | null; onRetry: () => void }) {
  if (!online) return <div className="flex items-center justify-center gap-6 bg-warning-container px-12 py-8 text-label-12 text-on-warning-container" role="status"><WifiOff aria-hidden className="size-16" />اتصال اینترنت برقرار نیست.</div>;
  if (!error) return null;
  return <div className="flex items-center justify-between gap-8 bg-error-container px-12 py-8 text-label-12 text-on-error-container" role="alert"><span>دریافت پیام‌ها ممکن نشد.</span><button className="font-bold underline" onClick={onRetry} type="button">تلاش دوباره</button></div>;
}

export function ConversationHeader({ conversation }: { conversation: ConversationType | null }) {
  const status = conversation?.status === "closed" ? "بسته‌شده" : conversation?.status === "pending" ? "منتظر پاسخ شما" : "در حال پیگیری";
  return <div className="flex min-w-0 items-center gap-8"><Image alt={`تصویر ${SUPPORT_AGENT.name}`} className="size-48 shrink-0 rounded-full object-cover" height={96} priority src={SUPPORT_AGENT.avatar} width={96}/><div className="min-w-0"><Dialog.Title className="m-0 text-title-18 font-bold text-text-primary">{SUPPORT_AGENT.name}</Dialog.Title><Dialog.Description className="m-0 mt-2 truncate text-label-12 text-text-secondary">{conversation ? status : "پشتیبانی کادوچی"}</Dialog.Description></div></div>;
}

export function MessageBubble({ message, onRetry }: { message: LocalMessage; onRetry?: (message: LocalMessage) => void }) {
  const customer = message.senderRole === "customer";
  return <li className={`flex ${customer ? "justify-start" : "justify-end"}`}>
    <div className={`max-w-[82%] rounded-l px-12 py-8 shadow-sm ${customer ? "rounded-es-xxs bg-secondary-container text-on-secondary-container" : "rounded-ee-xxs bg-surface text-text-primary"}`}>
      <p className="m-0 whitespace-pre-wrap break-words text-body-14">{message.body}</p>
      <div className="mt-4 flex items-center justify-end gap-6 text-label-10 opacity-70"><time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>{message.delivery === "sending" ? <span>در حال ارسال…</span> : null}{message.delivery === "failed" ? <button className="font-bold underline" onClick={() => onRetry?.(message)} type="button">ارسال دوباره</button> : null}</div>
    </div>
  </li>;
}

export const Message = MessageBubble;

export function MessageList({ messages, hasMore, loadingOlder, onLoadOlder, onRetry }: { messages: LocalMessage[]; hasMore: boolean; loadingOlder: boolean; onLoadOlder: () => void; onRetry: (message: LocalMessage) => void }) {
  const endRef = useRef<HTMLDivElement>(null);
  const previousCount = useRef(0);
  useEffect(() => { if (messages.length > previousCount.current) endRef.current?.scrollIntoView({ block: "end" }); previousCount.current = messages.length; }, [messages.length]);
  return <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface-soft px-12 py-16" aria-label="پیام‌های گفتگو">
    {hasMore ? <div className="mb-12 text-center"><Button loading={loadingOlder} onClick={onLoadOlder} size="small" variant="link-ghost"><ChevronUp aria-hidden />پیام‌های قدیمی‌تر</Button></div> : null}
    {!messages.length ? <div className="grid h-full min-h-0 place-content-center px-24 py-20 text-center"><MessageCircle aria-hidden className="mx-auto mb-10 size-40 text-secondary" /><p className="m-0 text-title-16 font-bold">هنوز پیامی ثبت نشده است</p><p className="mb-0 mt-4 text-body-14 text-text-secondary">پیام خود را بنویسید تا پاسخ دهیم.</p></div> : null}
    <ol className="m-0 grid list-none gap-10 p-0">{messages.map((message) => <MessageBubble key={message.id} message={message} onRetry={onRetry} />)}</ol>
    <div ref={endRef} />
  </div>;
}

export function MessageComposer({ disabled, onSend }: { disabled?: boolean; onSend: (body: string) => Promise<void> }) {
  const [body, setBody] = useState(""); const [sending, setSending] = useState(false); const inputRef = useRef<HTMLTextAreaElement>(null);
  async function submit() { const value=body.trim(); if(!value||sending||disabled)return; setSending(true); setBody(""); try{await onSend(value);}catch{setBody(value);}finally{setSending(false);inputRef.current?.focus();} }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) { if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();void submit();} }
  const sendAction=<Button aria-label="ارسال پیام" className="size-40 shrink-0 px-0" disabled={!body.trim()||disabled} loading={sending} onClick={()=>void submit()} size="small" variant="secondary-filled"><Send aria-hidden /></Button>;
  return <div className="border-t border-border-low-emphasis bg-surface-background p-12 pb-[max(env(safe-area-inset-bottom),var(--spacing-12))]">
    <TextArea aria-label="متن پیام" disabled={disabled||sending} fieldClassName="h-48 min-h-48 resize-none transition-[height,border-color,box-shadow,background-color] duration-200 focus-within:h-96 focus-within:min-h-96" maxLength={2000} onChange={(event)=>setBody(event.currentTarget.value)} onKeyDown={keyDown} placeholder="پیام خود را بنویسید…" ref={inputRef} rows={1} showCount={false} size="sm" trailingAction={sendAction} value={body} />
  </div>;
}

type GuestStep = "message" | "name" | "phone";

function OnboardingBubble({ customer = false, children }: { customer?: boolean; children: React.ReactNode }) {
  return <li className={`flex ${customer ? "justify-start" : "justify-end"}`}><p className={`m-0 max-w-[82%] whitespace-pre-wrap rounded-l px-12 py-8 text-body-14 shadow-sm ${customer ? "rounded-es-xxs bg-secondary-container text-on-secondary-container" : "rounded-ee-xxs bg-surface text-text-primary"}`}>{children}</p></li>;
}

export function GuestOnboarding({ busy, onStart }: { busy: boolean; onStart: (name: string, phone: string, initialMessage: string, operationId: string) => Promise<void> }) {
  const [step,setStep]=useState<GuestStep>("message");const [draft,setDraft]=useState("");const [initialMessage,setInitialMessage]=useState("");const [name,setName]=useState("");const [error,setError]=useState<string|null>(null);const operationId=useRef<string|null>(null);
  const inputRef=useRef<HTMLInputElement>(null);const messageRef=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{if(step!=="message")inputRef.current?.focus();},[step]);

  async function finish(phone:string){setError(null);if(!operationId.current)operationId.current=crypto.randomUUID();try{await onStart(name,phone.trim(),initialMessage,operationId.current);}catch(caught){setError(caught instanceof ServiceError&&caught.detail.code==="validation"?"شماره همراه معتبر نیست؛ لطفاً دوباره وارد کنید.":"شروع گفتگو ممکن نشد. دوباره تلاش کنید.");}}
  async function submit(event:FormEvent){event.preventDefault();const value=draft.trim();setError(null);if(step==="message"){if(!value)return;setInitialMessage(value);setDraft("");setStep("name");return;}if(step==="name"){if(value.length<2){setError("لطفاً نامتان را با حداقل دو حرف بفرستید.");return;}setName(value);setDraft("");setStep("phone");return;}await finish(value);}
  function keyDown(event:KeyboardEvent<HTMLTextAreaElement>){if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();event.currentTarget.form?.requestSubmit();}}
  const placeholder=step==="message"?"پیامتان را بنویسید…":step==="name"?"نام شما":"مثلاً 09121234567";
  const sendAction=<Button aria-label={step==="phone"&&!draft.trim()?"رد کردن شماره همراه":"ارسال"} className="size-40 shrink-0 px-0" disabled={busy||((step==="message"||step==="name")&&!draft.trim())} loading={busy} size="small" type="submit" variant="secondary-filled"><Send aria-hidden/></Button>;

  return <><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface-soft px-12 py-16" aria-label="شروع گفتگو"><ol className="m-0 grid list-none gap-10 p-0" aria-live="polite"><OnboardingBubble>سلام، من {SUPPORT_AGENT.name} هستم 👋 چطور می‌تونم کمکتون کنم؟</OnboardingBubble>{initialMessage?<OnboardingBubble customer>{initialMessage}</OnboardingBubble>:null}{step!=="message"?<OnboardingBubble>حتماً پیگیری می‌کنم. اول اسمتون رو می‌فرمایید؟</OnboardingBubble>:null}{name?<OnboardingBubble customer>{name}</OnboardingBubble>:null}{step==="phone"?<OnboardingBubble>ممنون {name}. اگر مایلید شماره همراهتون رو هم بفرستید تا در صورت نیاز بهتر پیگیری کنیم؛ می‌تونید این مرحله رو رد کنید.</OnboardingBubble>:null}</ol></div><form className="grid gap-8 border-t border-border-low-emphasis bg-surface-background p-12 pb-[max(env(safe-area-inset-bottom),var(--spacing-12))]" onSubmit={(event)=>void submit(event)}>{step==="message"?<TextArea aria-label="متن پیام" fieldClassName="h-48 min-h-48 resize-none transition-[height,border-color,box-shadow,background-color] duration-200 focus-within:h-96 focus-within:min-h-96" maxLength={2000} onChange={(event)=>setDraft(event.currentTarget.value)} onKeyDown={keyDown} placeholder={placeholder} ref={messageRef} rows={1} showCount={false} size="sm" trailingAction={sendAction} value={draft}/>:<Input aria-label={step==="name"?"نام شما":"شماره همراه"} autoComplete={step==="name"?"name":"tel"} dir={step==="phone"?"ltr":"rtl"} inputMode={step==="phone"?"tel":"text"} maxLength={step==="name"?100:30} onChange={(event)=>setDraft(event.currentTarget.value)} placeholder={placeholder} ref={inputRef} size="sm" trailingAction={sendAction} value={draft}/>} {step==="phone"?<button className="justify-self-start text-label-12 font-bold text-secondary underline" disabled={busy} onClick={()=>void finish("")} type="button">فعلاً بدون شماره ادامه می‌دهم</button>:null}{error?<p className="m-0 text-label-12 text-error" role="alert">{error}</p>:null}</form></>;
}

export function Conversation({ conversation, messages, hasMore, loadingOlder, online, error, onLoadOlder, onRetryLoad, onRetryMessage, onSend, onStartNew }: { conversation: ConversationType; messages: LocalMessage[]; hasMore: boolean; loadingOlder: boolean; online: boolean; error: Error|null; onLoadOlder:()=>void; onRetryLoad:()=>void; onRetryMessage:(message:LocalMessage)=>void; onSend:(body:string)=>Promise<void>; onStartNew:()=>Promise<void> }) {
  return <><ChatStatus error={error} online={online} onRetry={onRetryLoad}/><MessageList hasMore={hasMore} loadingOlder={loadingOlder} messages={messages} onLoadOlder={onLoadOlder} onRetry={onRetryMessage}/>{conversation.status==="closed"?<div className="grid gap-8 border-t border-border-low-emphasis p-12 text-center"><p className="m-0 text-label-12 text-text-secondary">این گفتگو بسته شده است.</p><Button onClick={()=>void onStartNew()} variant="secondary-filled">شروع گفتگوی جدید</Button></div>:<MessageComposer disabled={!online} onSend={onSend}/>}</>;
}

export function ChatLauncher({ buttonRef, onOpen, unread, showGreeting }: { buttonRef: React.RefObject<HTMLButtonElement|null>; onOpen: () => void; unread: number; showGreeting: boolean }) {
  return <button aria-label={unread?`پشتیبانی، ${unread} پیام خوانده‌نشده`:"باز کردن گفتگوی پشتیبانی"} className="fixed bottom-[calc(80px+max(env(safe-area-inset-bottom),var(--spacing-16)))] right-16 z-[1050] grid size-56 place-items-center rounded-full bg-secondary text-on-secondary shadow-[0_6px_20px_rgb(0_0_0_/_0.25)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 lg:bottom-24 lg:right-24" onClick={onOpen} ref={buttonRef} type="button">{showGreeting?<span className="absolute bottom-[calc(100%+8px)] right-0 inline-flex w-fit max-w-[calc(100vw-32px)] items-center whitespace-nowrap rounded-lg bg-surface-background p-8 text-right text-label-12 font-medium leading-none text-text-primary shadow-lg" dir="rtl" role="status">{SUPPORT_GREETING}<span aria-hidden className="absolute -bottom-4 right-16 size-8 rotate-45 bg-surface-background"/></span>:null}<MessageCircle aria-hidden className="size-28" />{unread>0?<span className="absolute -right-4 -top-4 grid min-h-22 min-w-22 place-items-center rounded-full bg-error px-4 text-label-10 font-bold text-on-error">{unread>99?"۹۹+":unread.toLocaleString("fa-IR")}</span>:null}</button>;
}

export function ChatWindow({ children, conversation, onRestoreFocus }: { children: React.ReactNode; conversation: ConversationType|null; onRestoreFocus: () => void }) {
  return <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[1299] bg-surface-scrim"/><Dialog.Content className="fixed inset-0 z-[1300] flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-surface-background text-text-primary outline-none sm:inset-auto sm:bottom-24 sm:right-24 sm:h-[min(620px,calc(100dvh-48px))] sm:w-[420px] sm:rounded-xl sm:shadow-2xl" dir="rtl" onCloseAutoFocus={(event)=>{event.preventDefault();onRestoreFocus();}}><header className="flex min-h-64 shrink-0 items-center justify-between gap-12 border-b border-border-low-emphasis px-16"><ConversationHeader conversation={conversation}/><Dialog.Close asChild><Button aria-label="بستن گفتگو" className="size-40 px-0" size="small" variant="link-ghost"><X aria-hidden /></Button></Dialog.Close></header>{children}</Dialog.Content></Dialog.Portal>;
}

export function SupportChat() {
  const auth=useAuth();const [open,setOpen]=useState(false);const [showGreeting,setShowGreeting]=useState(false);const [conversation,setConversation]=useState<ConversationType|null>(null);const [messages,setMessages]=useState<LocalMessage[]>([]);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [loadingOlder,setLoadingOlder]=useState(false);const [hasMore,setHasMore]=useState(false);const [online,setOnline]=useState(()=>typeof navigator==="undefined"?true:navigator.onLine);const [error,setError]=useState<Error|null>(null);const newest=messages.filter((m)=>!m.delivery).at(-1)?.id;const oldest=messages.filter((m)=>!m.delivery).at(0)?.id;const conversationId=conversation?.id;const openRef=useRef(false);const launcherRef=useRef<HTMLButtonElement>(null);
  const authenticatedName=auth.customer?[auth.customer.firstName,auth.customer.lastName].filter(Boolean).join(" ").trim()||auth.customer.displayName:"";
  const authenticatedPhone=auth.customer?.phone||"";
  const loadSession=useCallback(async()=>{try{const result=await getCurrentConversation();setConversation(result.conversation);setError(null);}catch(caught){setError(caught instanceof Error?caught:new Error("Support unavailable"));}finally{setLoading(false);}},[]);
  const loadConversation=useCallback(async()=>{setError(null);try{const result=await getCurrentConversation();setConversation(result.conversation);if(result.conversation){const page=await listMessages(result.conversation.id);setMessages(page.items);setHasMore(page.hasMore);const received=page.items.filter((m)=>m.senderRole==="administrator").at(-1);if(received)void markRead(result.conversation.id,received.id).then(()=>setConversation((current)=>current?{...current,unreadCount:0}:current)).catch(()=>undefined);}else setMessages([]);}catch(caught){setError(caught instanceof Error?caught:new Error("Support unavailable"));}finally{setLoading(false);}},[]);
  useEffect(()=>{openRef.current=open;},[open]);
  useEffect(()=>{const timer=window.setTimeout(()=>setShowGreeting(true),5000);return()=>window.clearTimeout(timer);},[]);
  useEffect(()=>{const initial=window.setTimeout(()=>void loadSession(),0);const onOnline=()=>{setOnline(true);if(openRef.current)void loadConversation();else void loadSession();};const onOffline=()=>setOnline(false);window.addEventListener("online",onOnline);window.addEventListener("offline",onOffline);return()=>{window.clearTimeout(initial);window.removeEventListener("online",onOnline);window.removeEventListener("offline",onOffline);};},[loadConversation,loadSession]);
  useEffect(()=>{if(auth.status!=="authenticated")return;void claimGuestConversation().then((result)=>{setConversation(result.conversation);if(openRef.current&&result.conversation)void loadConversation();}).catch(()=>undefined);},[auth.status,loadConversation]);
  useEffect(()=>{if(!open||!conversationId||document.hidden||!online)return;let delay=5000;let timer:number;let stopped=false;const poll=async()=>{try{const [page,latest]=await Promise.all([listMessages(conversationId,newest?{after:newest,perPage:50}:{perPage:30}),getConversation(conversationId)]);if(!stopped){setConversation(latest.conversation);if(page.items.length){setMessages((current)=>mergeMessages(current,page.items));const received=page.items.filter((m)=>m.senderRole==="administrator").at(-1);if(received)void markRead(conversationId,received.id).then(()=>setConversation((current)=>current?{...current,unreadCount:0}:current));}}delay=5000;setError(null);}catch(caught){delay=Math.min(30000,delay*2);setError(caught instanceof Error?caught:new Error("Polling failed"));}if(!stopped)timer=window.setTimeout(poll,delay);};timer=window.setTimeout(poll,delay);const visible=()=>{if(!document.hidden){window.clearTimeout(timer);void poll();}};document.addEventListener("visibilitychange",visible);return()=>{stopped=true;window.clearTimeout(timer);document.removeEventListener("visibilitychange",visible);};},[open,conversationId,newest,online]);
  async function start(name:string,phone:string,startNew=false,initialMessage?:string,initialOperationId?:string){setBusy(true);try{const result=await createConversation({displayName:name,phone:phone||null,startNew});if(result.conversation&&initialMessage){await sendMessage(result.conversation.id,{body:initialMessage,operationId:initialOperationId||crypto.randomUUID()});}setConversation(result.conversation);setMessages([]);setHasMore(false);if(result.conversation)await loadConversation();}finally{setBusy(false);}}
  async function send(body:string,operationId=crypto.randomUUID()){if(!conversation)return;const tempId=`00000000-0000-4000-8000-${operationId.replaceAll("-","").slice(-12)}`;const optimistic:LocalMessage={id:tempId,body,senderRole:"customer",createdAt:new Date().toISOString(),readAt:null,delivery:"sending",operationId};setMessages((current)=>[...current,optimistic]);try{const saved=await sendMessage(conversation.id,{body,operationId});setMessages((current)=>mergeMessages(current.filter((message)=>message.id!==tempId),[saved]));setConversation((current)=>current?{...current,status:"open",lastMessageAt:saved.createdAt}:current);}catch{setMessages((current)=>current.map((message)=>message.id===tempId?{...message,delivery:"failed"}:message));}}
  async function retryMessage(message:LocalMessage){if(message.operationId){setMessages((current)=>current.filter((item)=>item.id!==message.id));await send(message.body,message.operationId);}}
  async function loadOlder(){if(!conversation||!oldest)return;setLoadingOlder(true);try{const page=await listMessages(conversation.id,{before:oldest,perPage:30});setMessages((current)=>mergeMessages(current,page.items));setHasMore(page.hasMore);}finally{setLoadingOlder(false);}}
  function openChat(){setShowGreeting(false);setOpen(true);void loadConversation();}
  const content=loading||auth.status==="loading"?<div className="grid min-h-0 flex-1 place-content-center" role="status"><RefreshCw aria-hidden className="size-32 animate-spin text-secondary"/><span className="sr-only">در حال بارگذاری گفتگو</span></div>:conversation?<Conversation conversation={conversation} error={error} hasMore={hasMore} loadingOlder={loadingOlder} messages={messages} online={online} onLoadOlder={()=>void loadOlder()} onRetryLoad={()=>void loadConversation()} onRetryMessage={(message)=>void retryMessage(message)} onSend={send} onStartNew={()=>start(auth.status==="authenticated"?authenticatedName:conversation.displayName,auth.status==="authenticated"?authenticatedPhone:"",true)}/>:auth.status==="authenticated"?<div className="grid min-h-0 flex-1 place-content-center gap-10 px-24 py-20 text-center"><MessageCircle aria-hidden className="mx-auto size-40 text-secondary"/><p className="m-0 text-body-14">برای ارتباط با پشتیبانی یک گفتگو ایجاد کنید.</p><Button loading={busy} onClick={()=>void start(authenticatedName||"کاربر کادوچی",authenticatedPhone)} variant="secondary-filled">شروع گفتگو</Button></div>:<GuestOnboarding busy={busy} onStart={(name,phone,initialMessage,operationId)=>start(name,phone,false,initialMessage,operationId)}/>;
  return <Dialog.Root onOpenChange={setOpen} open={open}><ChatLauncher buttonRef={launcherRef} onOpen={openChat} showGreeting={showGreeting&&!open} unread={conversation?.unreadCount??0}/><ChatWindow conversation={conversation} onRestoreFocus={()=>launcherRef.current?.focus()}>{content}</ChatWindow></Dialog.Root>;
}

export default SupportChat;
