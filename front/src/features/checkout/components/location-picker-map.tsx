"use client";

import { LocateFixed } from "lucide-react";
import { useEffect, useRef, useState, type MutableRefObject } from "react";

export type DeliveryLocation = {
  latitude: number;
  longitude: number;
};

type Leaflet = typeof import("leaflet");

const TEHRAN: DeliveryLocation = { latitude: 35.6892, longitude: 51.389 };

function roundedLocation(latitude: number, longitude: number): DeliveryLocation {
  return {
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
  };
}

function setMarker(
  leaflet: Leaflet,
  map: import("leaflet").Map,
  markerRef: MutableRefObject<import("leaflet").CircleMarker | null>,
  location: DeliveryLocation,
) {
  const coordinates: [number, number] = [location.latitude, location.longitude];
  if (markerRef.current) {
    markerRef.current.setLatLng(coordinates);
    return;
  }

  markerRef.current = leaflet.circleMarker(coordinates, {
    color: "#ffffff",
    fillColor: "#00874d",
    fillOpacity: 1,
    radius: 10,
    weight: 3,
  }).addTo(map);
}

/** An interactive, click-to-pin OpenStreetMap picker for Tehran deliveries. */
export function LocationPickerMap({
  value,
  onChange,
}: {
  value: DeliveryLocation | null;
  onChange: (location: DeliveryLocation) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<Leaflet | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").CircleMarker | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    void import("leaflet").then((leaflet) => {
      if (disposed) return;
      const selectedLocation = valueRef.current;

      const map = leaflet.map(container, {
        center: [selectedLocation?.latitude ?? TEHRAN.latitude, selectedLocation?.longitude ?? TEHRAN.longitude],
        maxBounds: [[34.7, 50.3], [36.5, 52.4]],
        minZoom: 9,
        zoom: selectedLocation ? 15 : 12,
        zoomControl: true,
        scrollWheelZoom: false,
      });
      leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright?locale=fa">همکاران OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      leafletRef.current = leaflet;
      mapRef.current = map;
      if (selectedLocation) setMarker(leaflet, map, markerRef, selectedLocation);

      map.on("click", ({ latlng }) => {
        const location = roundedLocation(latlng.lat, latlng.lng);
        setMarker(leaflet, map, markerRef, location);
        onChangeRef.current(location);
      });
    });

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    valueRef.current = value;
    if (!value || !leafletRef.current || !mapRef.current) return;
    setMarker(leafletRef.current, mapRef.current, markerRef, value);
  }, [value]);

  const locateUser = () => {
    if (!navigator.geolocation) {
      setLocationError("مرورگر شما از تشخیص موقعیت مکانی پشتیبانی نمی‌کند.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = roundedLocation(coords.latitude, coords.longitude);
        valueRef.current = location;
        if (leafletRef.current && mapRef.current) {
          setMarker(leafletRef.current, mapRef.current, markerRef, location);
          mapRef.current.flyTo([location.latitude, location.longitude], 16);
        }
        onChangeRef.current(location);
        setLocating(false);
      },
      () => {
        setLocationError("دسترسی به موقعیت مکانی ممکن نشد. اجازه دسترسی را بررسی کنید.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  return <div className="grid gap-8">
    <p className="m-0 text-label-14 text-surface-neutral-mid-emphasis">
      برای تعیین دقیق محل تحویل، روی نقطه موردنظر در نقشه بزنید.
    </p>
    <div className="relative">
      <div
        aria-label="نقشه OpenStreetMap برای انتخاب محل تحویل"
        className="h-[280px] overflow-hidden rounded-m border border-border-high-emphasis [direction:ltr]"
        ref={containerRef}
        role="application"
      />
      <button
        aria-label="تشخیص موقعیت فعلی من روی نقشه"
        className="absolute bottom-12 end-12 z-[500] inline-flex h-40 items-center gap-6 rounded-m bg-surface-background px-12 text-label-14 font-bold text-surface-neutral-high-emphasis shadow-md ring-1 ring-border-high-emphasis transition-colors hover:bg-surface-neutral-low-emphasis focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
        disabled={locating}
        type="button"
        onClick={locateUser}
      >
        <LocateFixed aria-hidden="true" className="size-16" />
        {locating ? "در حال تشخیص…" : "موقعیت فعلی من"}
      </button>
    </div>
    {locationError ? <p className="m-0 text-label-12 text-error" role="alert">{locationError}</p> : null}
    <p aria-live="polite" className="m-0 text-label-12 text-surface-neutral-mid-emphasis">
      {value
        ? `موقعیت انتخاب‌شده: ${value.latitude.toFixed(6)}، ${value.longitude.toFixed(6)}`
        : "هنوز موقعیتی انتخاب نشده است."}
    </p>
  </div>;
}
