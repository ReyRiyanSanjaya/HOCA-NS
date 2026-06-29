"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  Grid3X3, List, Maximize2, Calendar, User, MapPin, Radio,
  Image as ImageIcon, Search, X, SlidersHorizontal, ChevronDown,
  ChevronUp, Download, ExternalLink, ChevronLeft, ChevronRight,
  RefreshCw, Filter, BarChart2, Clock,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageContainer }  from "@/components/layout/page-container";
import { GlobalFilter }   from "@/components/dashboard/global-filter";
import { Badge }          from "@/components/ui/badge";
import { Skeleton }       from "@/components/ui/skeleton";
import { Progress }       from "@/components/ui/progress";
import { Input }          from "@/components/ui/input";
import { Label }          from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea }     from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useGallery }     from "@/hooks/use-dashboard";
import { useFilterStore } from "@/stores/filter-store";
import { CACHE_KEYS, BRANDS } from "@/lib/config";
import { getBrandColor, getGoogleMapsURL, formatNumber, cn } from "@/lib/utils";
import type { GalleryItem } from "@/types";

// ─── helpers ────────────────────────────────────────────────────────────────
function driveImgUrl(url: string, size = 400): string {
  if (!url) return "";
  if (url.includes("thumbnail")) return url;
  let fileId = "";
  const ucMatch   = url.match(/[?&]id=([^&]+)/);
  const viewMatch = url.match(/\/d\/([^/]+)/);
  if (ucMatch)       fileId = ucMatch[1];
  else if (viewMatch) fileId = viewMatch[1];
  if (!fileId) return url;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%231e293b'/%3E%3Ctext x='50' y='54' text-anchor='middle' fill='%2364748b' font-size='10' font-family='sans-serif'%3ENo Photo%3C/text%3E%3C/svg%3E";

type ViewMode = "grid" | "timeline" | "masonry";

// ─── local filter ────────────────────────────────────────────────────────────
interface LocalGalleryFilter {
  search: string;
  brand: string;
  kabupaten: string;
  cluster: string;
  supervisor: string;
  promotor: string;
  dateFrom: string;
  dateTo: string;
}
const initFilter: LocalGalleryFilter = {
  search:"", brand:"", kabupaten:"", cluster:"", supervisor:"", promotor:"", dateFrom:"", dateTo:"",
};

// ─── Thumbnail card ──────────────────────────────────────────────────────────
function GalleryThumb({ item, onClick, index }: { item: GalleryItem; onClick: () => void; index: number }) {
  const [loaded, setLoaded] = useState(false);
  const src = driveImgUrl(item.photoURL, 300);

  return (
    <button
      onClick={onClick}
      className="group relative aspect-square rounded-2xl overflow-hidden border border-border/60
        hover:ring-2 hover:ring-primary hover:shadow-xl transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-primary bg-muted animate-fade-up"
      style={{ animationDelay: `${Math.min(index * 25, 400)}ms` }}
      aria-label={`Foto ${item.idBTS}`}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src} alt={item.idBTS}
        className={cn("w-full h-full object-cover group-hover:scale-105 transition-transform duration-300", loaded?"opacity-100":"opacity-0")}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; setLoaded(true); }}
      />
      {/* Bottom overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent
        opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2.5 flex flex-col justify-end gap-0.5">
        <p className="text-white text-xs font-bold truncate leading-tight">{item.idBTS}</p>
        <p className="text-white/70 text-[10px] truncate">{item.promotor}</p>
        <p className="text-white/50 text-[9px] tabular-nums">{item.tanggal}</p>
      </div>
      {/* Brand dot */}
      <div className="absolute top-2 left-2 h-2.5 w-2.5 rounded-full border-2 border-white/70 shadow-md"
        style={{ backgroundColor: getBrandColor(item.brand) }} />
      {/* Expand icon */}
      <div className="absolute top-2 right-2 h-6 w-6 rounded-lg bg-black/40 backdrop-blur-sm flex items-center justify-center
        opacity-0 group-hover:opacity-100 transition-opacity">
        <Maximize2 className="h-3 w-3 text-white" />
      </div>
    </button>
  );
}

// ─── Timeline row item ────────────────────────────────────────────────────────
function TimelineItem({ item, onClick }: { item: GalleryItem; onClick: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const src = driveImgUrl(item.photoURL, 200);
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/50 transition-colors w-full text-left group"
    >
      <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 bg-muted border border-border/60">
        {!loaded && <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground/30"/></div>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={item.idBTS} className={cn("w-full h-full object-cover", loaded?"":"hidden")}
          onLoad={()=>setLoaded(true)} onError={(e)=>{(e.target as HTMLImageElement).src=PLACEHOLDER;setLoaded(true);}}/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold truncate">{item.idBTS}</span>
          <span className="h-2 w-2 rounded-full shrink-0" style={{background:getBrandColor(item.brand)}}/>
          <span className="text-[10px] font-semibold" style={{color:getBrandColor(item.brand)}}>{item.brand}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{item.promotor}</p>
        <p className="text-[10px] text-muted-foreground">{item.kabupaten}{item.cluster?` · ${item.cluster}`:""}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[10px] text-muted-foreground tabular-nums">{item.tanggal}</p>
        <Maximize2 className="h-3.5 w-3.5 text-muted-foreground mt-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"/>
      </div>
    </button>
  );
}

// ─── Filter Panel ────────────────────────────────────────────────────────────
function GalleryFilterPanel({
  local, setLocal, options, total, matched,
}: {
  local: LocalGalleryFilter;
  setLocal: (f: LocalGalleryFilter) => void;
  options: { brands: string[]; kabupatenList: string[]; clusterList: string[]; supervisors: string[]; promotors: string[] };
  total: number; matched: number;
}) {
  const [open, setOpen] = useState(false);
  const set = (k: keyof LocalGalleryFilter, v: string) => setLocal({ ...local, [k]: v });
  const reset = () => setLocal(initFilter);
  const activeCount = Object.values(local).filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm mb-5 overflow-hidden">
      <div className="flex items-center gap-2 p-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/>
          <Input
            placeholder="Cari Tower ID, promotor, kabupaten…"
            className="pl-9 h-9 text-xs bg-muted/40 border-0 focus-visible:ring-1 rounded-xl"
            value={local.search}
            onChange={e=>set("search",e.target.value)}
          />
        </div>
        {/* count */}
        <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums hidden sm:block">
          <b className={matched<total?"text-blue-600 dark:text-blue-400":""}>{formatNumber(matched)}</b>
          /{formatNumber(total)} foto
        </span>
        {/* filter toggle */}
        <button
          onClick={()=>setOpen(v=>!v)}
          className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95",
            open||activeCount>0?"gradient-blue text-white shadow-md":"bg-muted/60 hover:bg-muted text-muted-foreground")}
        >
          <SlidersHorizontal className="h-3.5 w-3.5"/>
          Filter
          {activeCount>0&&<span className="h-4 w-4 rounded-full bg-white/25 text-[10px] font-bold flex items-center justify-center">{activeCount}</span>}
          {open?<ChevronUp className="h-3 w-3"/>:<ChevronDown className="h-3 w-3"/>}
        </button>
        {activeCount>0&&(
          <button onClick={reset}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
            <X className="h-4 w-4"/>
          </button>
        )}
      </div>

      {/* Active pills */}
      {activeCount>0&&!open&&(
        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
          {Object.entries(local).map(([k,v])=>v&&k!=="search"?(
            <Badge key={k} variant="secondary" className="text-[10px] gap-1 pl-2 pr-1 py-0.5 rounded-full">
              {v}
              <button onClick={()=>set(k as keyof LocalGalleryFilter,"")} className="hover:text-destructive"><X className="h-2.5 w-2.5"/></button>
            </Badge>
          ):null)}
        </div>
      )}

      {open&&(
        <div className="px-3 pb-4 pt-3 border-t border-border/40 animate-fade-up">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Dari</Label>
              <Input type="date" className="h-8 text-xs rounded-xl border-border/60" value={local.dateFrom} onChange={e=>set("dateFrom",e.target.value)}/>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Sampai</Label>
              <Input type="date" className="h-8 text-xs rounded-xl border-border/60" value={local.dateTo} onChange={e=>set("dateTo",e.target.value)}/>
            </div>
            {([
              {label:"Brand",      key:"brand"      as const, list:options.brands},
              {label:"Kabupaten",  key:"kabupaten"  as const, list:options.kabupatenList},
              {label:"Cluster",    key:"cluster"    as const, list:options.clusterList},
              {label:"Supervisor", key:"supervisor" as const, list:options.supervisors},
              {label:"Promotor",   key:"promotor"   as const, list:options.promotors},
            ]).map(({label,key,list})=>(
              <div key={key} className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</Label>
                <Select value={local[key]||"all"} onValueChange={v=>set(key,v==="all"?"":v)}>
                  <SelectTrigger className="h-8 text-xs rounded-xl border-border/60"><SelectValue placeholder="Semua"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {list.map(i=><SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          {activeCount>0&&(
            <button onClick={reset} className="mt-3 text-xs text-muted-foreground hover:text-destructive underline underline-offset-2 transition-colors">
              Reset semua filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({
  item, items, onClose, onPrev, onNext, hasPrev, hasNext,
}: {
  item: GalleryItem; items: GalleryItem[];
  onClose: ()=>void; onPrev: ()=>void; onNext: ()=>void;
  hasPrev: boolean; hasNext: boolean;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const src = driveImgUrl(item.photoURL, 900);
  const idx = items.indexOf(item);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden rounded-2xl gap-0">
        <div className="flex flex-col lg:flex-row max-h-[92vh]">
          {/* Photo area */}
          <div className="relative flex-1 bg-slate-950 flex items-center justify-center min-h-64 lg:min-h-[500px]">
            {!imgLoaded&&<div className="absolute inset-0 flex items-center justify-center"><div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin"/></div>}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={item.idBTS}
              className={cn("max-w-full max-h-[60vh] lg:max-h-[85vh] object-contain transition-opacity duration-300", imgLoaded?"opacity-100":"opacity-0")}
              onLoad={()=>setImgLoaded(true)}
              onError={(e)=>{(e.target as HTMLImageElement).src=PLACEHOLDER;setImgLoaded(true);}}
            />

            {/* Nav arrows */}
            {hasPrev&&(
              <button onClick={e=>{e.stopPropagation();onPrev();}}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 backdrop-blur-sm
                  text-white flex items-center justify-center hover:bg-black/75 transition-colors">
                <ChevronLeft className="h-5 w-5"/>
              </button>
            )}
            {hasNext&&(
              <button onClick={e=>{e.stopPropagation();onNext();}}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 backdrop-blur-sm
                  text-white flex items-center justify-center hover:bg-black/75 transition-colors">
                <ChevronRight className="h-5 w-5"/>
              </button>
            )}

            {/* Photo counter */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[10px] tabular-nums">
              {idx+1} / {items.length}
            </div>

            {/* Open original */}
            {item.photoURL&&(
              <a href={item.photoURL} target="_blank" rel="noopener noreferrer"
                className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/50 backdrop-blur-sm text-white text-[10px] hover:bg-black/75 transition-colors">
                <ExternalLink className="h-3 w-3"/>
                Buka asli
              </a>
            )}
          </div>

          {/* Info panel */}
          <div className="w-full lg:w-72 bg-card border-t lg:border-t-0 lg:border-l border-border/60 flex flex-col">
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between shrink-0">
              <div>
                <p className="font-bold text-sm">{item.idBTS}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.towerName||"—"}</p>
              </div>
              <div className="h-8 w-8 rounded-full flex items-center justify-center border-2 border-white/50 shadow"
                style={{background:getBrandColor(item.brand)}}>
                <span className="text-[9px] text-white font-bold">{item.brand.substring(0,2)}</span>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {/* Brand badge */}
                <div className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
                  style={{background:`${getBrandColor(item.brand)}15`}}>
                  <div className="h-3 w-3 rounded-full shrink-0" style={{background:getBrandColor(item.brand)}}/>
                  <span className="text-sm font-bold" style={{color:getBrandColor(item.brand)}}>{item.brand}</span>
                </div>

                {[
                  {icon:Calendar,  label:"Tanggal",    value:item.tanggal},
                  {icon:User,      label:"Promotor",   value:item.promotor},
                  {icon:User,      label:"Supervisor", value:item.supervisor},
                  {icon:MapPin,    label:"Kabupaten",  value:item.kabupaten},
                  {icon:Filter,    label:"Cluster",    value:item.cluster||"—"},
                  {icon:User,      label:"PM",         value:item.pm||"—"},
                ].map(({icon:Icon,label,value})=>(
                  <div key={label} className="flex items-start gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground"/>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                      <p className="text-xs font-semibold truncate mt-0.5">{value}</p>
                    </div>
                  </div>
                ))}

                {/* GPS */}
                {!!(item.latitudeUser&&item.longitudeUser)&&(
                  <a href={getGoogleMapsURL(item.latitudeUser,item.longitudeUser)}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/8
                      px-3 py-2 text-blue-600 dark:text-blue-400 text-xs hover:bg-blue-500/15 transition-colors">
                    <MapPin className="h-3.5 w-3.5 shrink-0"/>
                    Lihat Lokasi di Google Maps
                    <ExternalLink className="h-3 w-3 ml-auto"/>
                  </a>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Stats bar ───────────────────────────────────────────────────────────────
function StatsBar({ items }: { items: GalleryItem[] }) {
  const stats = useMemo(()=>{
    const brandMap: Record<string,number> = {};
    const kabMap:   Record<string,number> = {};
    const dateMap:  Record<string,number> = {};
    for (const it of items) {
      brandMap[it.brand]    = (brandMap[it.brand]||0)+1;
      kabMap[it.kabupaten]  = (kabMap[it.kabupaten]||0)+1;
      if (it.tanggal) dateMap[it.tanggal] = (dateMap[it.tanggal]||0)+1;
    }
    const topBrand = Object.entries(brandMap).sort((a,b)=>b[1]-a[1])[0];
    const topKab   = Object.entries(kabMap).sort((a,b)=>b[1]-a[1])[0];
    const days     = Object.keys(dateMap).length;
    return { brandMap, topBrand, topKab, days };
  },[items]);

  if (!items.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {[
        {label:"Total Foto",      value:formatNumber(items.length),             icon:ImageIcon, color:"#3b82f6"},
        {label:"Hari Aktif",      value:`${stats.days}`,                        icon:Clock,     color:"#10b981"},
        {label:"Brand Terbanyak", value:stats.topBrand?stats.topBrand[0]:"—",  icon:BarChart2, color: stats.topBrand?getBrandColor(stats.topBrand[0]):"#6b7280"},
        {label:"Kabupaten Aktif", value:`${Object.keys({...{}}).length||Object.entries(stats.brandMap).length}`, icon:MapPin, color:"#f59e0b"},
      ].map(({label,value,icon:Icon,color})=>(
        <div key={label} className="rounded-2xl bg-card border border-border/60 px-4 py-3 flex items-center gap-3 hover:shadow-md transition-all">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{background:`${color}18`}}>
            <Icon className="h-4 w-4" style={{color}}/>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{color}}>{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Brand filter chips (quick-select) ───────────────────────────────────────
function BrandChips({ items, selected, onSelect }: {
  items: GalleryItem[]; selected: string; onSelect: (b:string)=>void;
}) {
  const counts = useMemo(()=>{
    const m: Record<string,number> = {};
    for (const it of items) m[it.brand]=(m[it.brand]||0)+1;
    return m;
  },[items]);

  const brands = useMemo(()=>[...new Set(items.map(i=>i.brand))].sort(),[items]);

  if (!brands.length) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide shrink-0">Brand:</span>
      <button
        onClick={()=>onSelect("")}
        className={cn("px-3 py-1 rounded-full text-xs font-semibold border transition-all",
          !selected?"bg-foreground text-background border-transparent":"bg-muted/60 border-border/60 hover:bg-muted text-muted-foreground")}
      >
        Semua ({formatNumber(items.length)})
      </button>
      {brands.map(b=>(
        <button key={b} onClick={()=>onSelect(selected===b?"":b)}
          className={cn("px-3 py-1 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5",
            selected===b?"border-transparent text-white":"bg-muted/60 border-border/60 hover:bg-muted text-muted-foreground")}
          style={selected===b?{background:getBrandColor(b)}:{}}
        >
          <span className="h-2 w-2 rounded-full" style={{background:getBrandColor(b)}}/>
          {b} ({counts[b]||0})
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GalleryPage() {
  const { filter }  = useFilterStore();
  const qc          = useQueryClient();
  const { data = [], isLoading } = useGallery(filter);

  const [viewMode,  setViewMode]  = useState<ViewMode>("grid");
  const [localF,    setLocalF]    = useState<LocalGalleryFilter>(initFilter);
  const [selected,  setSelected]  = useState<GalleryItem|null>(null);

  const handleRefresh = useCallback(()=>{
    qc.invalidateQueries({ queryKey:[CACHE_KEYS.gallery] });
  },[qc]);

  // ── dropdown options ──────────────────────────────────────────────────
  const opts = useMemo(()=>({
    brands:        [...new Set(data.map(d=>d.brand).filter(Boolean))].sort() as string[],
    kabupatenList: [...new Set(data.map(d=>d.kabupaten).filter(Boolean))].sort() as string[],
    clusterList:   [...new Set(data.map(d=>d.cluster).filter(Boolean))].sort() as string[],
    supervisors:   [...new Set(data.map(d=>d.supervisor).filter(Boolean))].sort() as string[],
    promotors:     [...new Set(data.map(d=>d.promotor).filter(Boolean))].sort() as string[],
  }),[data]);

  // ── apply local filter ────────────────────────────────────────────────
  const filtered = useMemo(()=>{
    let list = data;
    if (localF.dateFrom)   list = list.filter(d=>d.tanggal>=localF.dateFrom);
    if (localF.dateTo)     list = list.filter(d=>d.tanggal<=localF.dateTo);
    if (localF.brand)      list = list.filter(d=>d.brand===localF.brand);
    if (localF.kabupaten)  list = list.filter(d=>d.kabupaten===localF.kabupaten);
    if (localF.cluster)    list = list.filter(d=>d.cluster===localF.cluster);
    if (localF.supervisor) list = list.filter(d=>d.supervisor===localF.supervisor);
    if (localF.promotor)   list = list.filter(d=>d.promotor===localF.promotor);
    if (localF.search.trim()) {
      const kw = localF.search.toLowerCase();
      list = list.filter(d=>
        d.idBTS.toLowerCase().includes(kw)||
        d.towerName?.toLowerCase().includes(kw)||
        d.promotor.toLowerCase().includes(kw)||
        d.kabupaten.toLowerCase().includes(kw)||
        d.supervisor?.toLowerCase().includes(kw)||
        d.cluster?.toLowerCase().includes(kw)
      );
    }
    return list;
  },[data, localF]);

  // ── grouped for timeline ─────────────────────────────────────────────
  const grouped = useMemo(()=>{
    const g: Record<string,GalleryItem[]> = {};
    filtered.forEach(it=>{ const d=it.tanggal||"Unknown"; if(!g[d]) g[d]=[]; g[d].push(it); });
    return Object.entries(g).sort((a,b)=>b[0].localeCompare(a[0]));
  },[filtered]);

  // ── lightbox nav ─────────────────────────────────────────────────────
  const selIdx    = selected ? filtered.indexOf(selected) : -1;
  const hasPrev   = selIdx > 0;
  const hasNext   = selIdx >= 0 && selIdx < filtered.length-1;
  const goPrev    = useCallback(()=>{ if (hasPrev) setSelected(filtered[selIdx-1]); },[hasPrev,filtered,selIdx]);
  const goNext    = useCallback(()=>{ if (hasNext) setSelected(filtered[selIdx+1]); },[hasNext,filtered,selIdx]);

  // keyboard nav
  React.useEffect(()=>{
    if (!selected) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key==="ArrowLeft")  goPrev();
      if (e.key==="ArrowRight") goNext();
      if (e.key==="Escape")     setSelected(null);
    };
    window.addEventListener("keydown",handler);
    return ()=>window.removeEventListener("keydown",handler);
  },[selected,goPrev,goNext]);

  // ── brand quick-filter (sets local filter) ────────────────────────────
  const setBrandQuick = useCallback((b:string)=>setLocalF(f=>({...f,brand:b})),[]);

  const isEmpty = !isLoading && filtered.length===0;

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Galeri Foto</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isLoading?"Memuat…":`${formatNumber(data.length)} foto dokumentasi aktivasi`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* View mode toggle */}
          <div className="flex gap-0.5 p-1 bg-muted rounded-xl">
            {([
              {mode:"grid"     as const, icon:Grid3X3, label:"Grid"},
              {mode:"masonry"  as const, icon:Grid3X3, label:"Masonry"},
              {mode:"timeline" as const, icon:List,     label:"Timeline"},
            ]).map(({mode,icon:Icon,label})=>(
              <button key={mode} onClick={()=>setViewMode(mode)}
                className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                  viewMode===mode?"bg-card shadow text-foreground":"text-muted-foreground hover:text-foreground")}
                aria-label={label}>
                <Icon className="h-3.5 w-3.5"/>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <button onClick={handleRefresh} disabled={isLoading}
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-border/60 bg-card hover:bg-muted transition-colors">
            <RefreshCw className={cn("h-3.5 w-3.5",isLoading&&"animate-spin")}/>
          </button>
        </div>
      </div>

      {/* Global filter (sends to API) */}
      <GlobalFilter/>

      {/* Stats bar */}
      {!isLoading && <StatsBar items={filtered}/>}

      {/* Brand quick chips */}
      {!isLoading && data.length>0 && (
        <BrandChips items={data} selected={localF.brand} onSelect={setBrandQuick}/>
      )}

      {/* Local filter panel */}
      <GalleryFilterPanel
        local={localF} setLocal={setLocalF}
        options={opts} total={data.length} matched={filtered.length}
      />

      {/* ── EMPTY STATE ──────────────────────────────────────────────── */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="h-20 w-20 rounded-3xl bg-muted/60 flex items-center justify-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/25"/>
          </div>
          <div className="text-center">
            <p className="font-semibold text-muted-foreground">Tidak ada foto ditemukan</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Coba ubah filter atau reset untuk melihat semua foto</p>
          </div>
          <button onClick={()=>setLocalF(initFilter)}
            className="text-xs text-blue-500 hover:text-blue-600 underline underline-offset-2">
            Reset filter
          </button>
        </div>
      )}

      {/* ── GRID VIEW ─────────────────────────────────────────────────── */}
      {!isEmpty && viewMode==="grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 animate-fade-up">
          {isLoading
            ? Array.from({length:12}).map((_,i)=><Skeleton key={i} className="aspect-square rounded-2xl"/>)
            : filtered.map((item,i)=>(
                <GalleryThumb key={item.id} item={item} index={i} onClick={()=>setSelected(item)}/>
              ))
          }
        </div>
      )}

      {/* ── MASONRY VIEW ──────────────────────────────────────────────── */}
      {!isEmpty && viewMode==="masonry" && (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 animate-fade-up">
          {isLoading
            ? Array.from({length:12}).map((_,i)=>(
                <div key={i} className="mb-3 break-inside-avoid">
                  <Skeleton className="w-full rounded-2xl" style={{height:`${140+Math.random()*100}px`}}/>
                </div>
              ))
            : filtered.map((item,i)=>{
                const [loaded, setLoaded] = [false,()=>{}]; // unused but ts needs it
                void loaded; void setLoaded;
                return (
                  <div key={item.id} className="mb-3 break-inside-avoid animate-fade-up" style={{animationDelay:`${Math.min(i*20,400)}ms`}}>
                    <MasonryCard item={item} onClick={()=>setSelected(item)}/>
                  </div>
                );
              })
          }
        </div>
      )}

      {/* ── TIMELINE VIEW ─────────────────────────────────────────────── */}
      {!isEmpty && viewMode==="timeline" && (
        <div className="space-y-5 animate-fade-up">
          {isLoading
            ? Array.from({length:3}).map((_,i)=>(
                <div key={i}>
                  <Skeleton className="h-5 w-32 mb-3"/>
                  <div className="space-y-2">{Array.from({length:3}).map((_,j)=><Skeleton key={j} className="h-20 rounded-xl"/>)}</div>
                </div>
              ))
            : grouped.map(([date,items])=>(
                <div key={date} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                  <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40 bg-muted/20">
                    <Calendar className="h-4 w-4 text-muted-foreground"/>
                    <h3 className="font-semibold text-sm">{date}</h3>
                    <Badge variant="secondary" className="text-[10px] tabular-nums">{items.length} foto</Badge>
                    {/* brand mini-count */}
                    <div className="ml-auto flex gap-1.5">
                      {[...new Set(items.map(i=>i.brand))].map(b=>(
                        <span key={b} className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{background:`${getBrandColor(b)}18`,color:getBrandColor(b)}}>
                          {b} {items.filter(i=>i.brand===b).length}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="divide-y divide-border/30">
                    {items.map(item=><TimelineItem key={item.id} item={item} onClick={()=>setSelected(item)}/>)}
                  </div>
                </div>
              ))
          }
        </div>
      )}

      {/* Lightbox */}
      {selected && (
        <Lightbox
          item={selected} items={filtered}
          onClose={()=>setSelected(null)}
          onPrev={goPrev} onNext={goNext}
          hasPrev={hasPrev} hasNext={hasNext}
        />
      )}
    </PageContainer>
  );
}

// ─── Masonry card (variable height) ──────────────────────────────────────────
function MasonryCard({ item, onClick }: { item:GalleryItem; onClick:()=>void }) {
  const [loaded, setLoaded] = useState(false);
  const src = driveImgUrl(item.photoURL, 400);
  return (
    <button onClick={onClick}
      className="group relative w-full rounded-2xl overflow-hidden border border-border/60
        hover:ring-2 hover:ring-primary hover:shadow-xl transition-all duration-200 bg-muted block text-left">
      {!loaded&&<div className="w-full h-32 flex items-center justify-center"><ImageIcon className="h-7 w-7 text-muted-foreground/20"/></div>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={item.idBTS} className={cn("w-full object-cover group-hover:scale-105 transition-transform duration-300", loaded?"":"hidden")}
        loading="lazy" onLoad={()=>setLoaded(true)} onError={(e)=>{(e.target as HTMLImageElement).src=PLACEHOLDER;setLoaded(true);}}/>
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent
        opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2.5 flex flex-col justify-end gap-0.5">
        <p className="text-white text-xs font-bold truncate">{item.idBTS}</p>
        <p className="text-white/70 text-[10px]">{item.promotor} · {item.brand}</p>
      </div>
      <div className="absolute top-2 left-2 h-2.5 w-2.5 rounded-full border-2 border-white/70 shadow-md"
        style={{background:getBrandColor(item.brand)}}/>
    </button>
  );
}
