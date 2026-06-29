"use client";

import React, { useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useMasterBTS,
  useMasterPromotor,
  useMasterSPV,
} from "@/hooks/use-master-data";
import { CACHE_KEYS } from "@/lib/config";

export default function MasterPage() {
  const queryClient = useQueryClient();
  const { data: btsData = [], isLoading: btsLoading } = useMasterBTS();
  const { data: promotorData = [], isLoading: promotorLoading } = useMasterPromotor();
  const { data: spvData = [], isLoading: spvLoading } = useMasterSPV();
  const [btsSearch, setBtsSearch] = useState("");
  const [promotorSearch, setPromotorSearch] = useState("");
  const [spvSearch, setSpvSearch] = useState("");

  const filteredBTS = btsData.filter(
    (b) =>
      !btsSearch ||
      b.id.toLowerCase().includes(btsSearch.toLowerCase()) ||
      b.towerName.toLowerCase().includes(btsSearch.toLowerCase()) ||
      b.kabupaten.toLowerCase().includes(btsSearch.toLowerCase())
  );

  const filteredPromotor = promotorData.filter(
    (p) =>
      !promotorSearch ||
      p.namaPromotor.toLowerCase().includes(promotorSearch.toLowerCase()) ||
      p.area?.toLowerCase().includes(promotorSearch.toLowerCase())
  );

  const filteredSPV = spvData.filter(
    (s) =>
      !spvSearch ||
      s.namaSPV.toLowerCase().includes(spvSearch.toLowerCase()) ||
      s.area?.toLowerCase().includes(spvSearch.toLowerCase())
  );

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.masterBTS] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.masterPromotor] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.masterSPV] });
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Master Data</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Read-only data from Google Sheets
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh All
        </Button>
      </div>

      <Tabs defaultValue="bts">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="bts">
            BTS{" "}
            <Badge variant="secondary" className="ml-2 text-xs">
              {btsData.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="promotor">
            Promotor{" "}
            <Badge variant="secondary" className="ml-2 text-xs">
              {promotorData.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="spv">
            SPV{" "}
            <Badge variant="secondary" className="ml-2 text-xs">
              {spvData.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* BTS Table */}
        <TabsContent value="bts" className="mt-4 animate-fade-in">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search BTS..."
                    className="pl-9 h-9"
                    value={btsSearch}
                    onChange={(e) => setBtsSearch(e.target.value)}
                  />
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {filteredBTS.length} results
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {["ID BTS", "Tower Name", "Kabupaten", "Kecamatan", "Cluster", "PM", "SPV", "Region", "Status"].map((h) => (
                        <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {btsLoading
                      ? Array.from({ length: 8 }).map((_, i) => (
                          <tr key={i} className="border-b border-border">
                            <td colSpan={9} className="px-3 py-3">
                              <Skeleton className="h-4 w-full" />
                            </td>
                          </tr>
                        ))
                      : filteredBTS.slice(0, 100).map((bts) => (
                          <tr
                            key={bts.id}
                            className="border-b border-border hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-3 py-2.5 font-medium">{bts.id}</td>
                            <td className="px-3 py-2.5 max-w-40 truncate">{bts.towerName}</td>
                            <td className="px-3 py-2.5">{bts.kabupaten}</td>
                            <td className="px-3 py-2.5">{bts.kecamatan}</td>
                            <td className="px-3 py-2.5">{bts.cluster}</td>
                            <td className="px-3 py-2.5">{bts.spm}</td>
                            <td className="px-3 py-2.5">{bts.spv}</td>
                            <td className="px-3 py-2.5">{bts.region}</td>
                            <td className="px-3 py-2.5">
                              <Badge
                                variant={
                                  bts.statusTower === "Active" ? "success" :
                                  bts.statusTower === "Problem" ? "destructive" : "warning"
                                }
                                className="text-xs"
                              >
                                {bts.statusTower || "Unknown"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
                {filteredBTS.length > 100 && (
                  <p className="text-xs text-center text-muted-foreground py-3">
                    Showing 100 of {filteredBTS.length} results. Use search to filter.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Promotor Table */}
        <TabsContent value="promotor" className="mt-4 animate-fade-in">
          <Card>
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search promotor..."
                  className="pl-9 h-9"
                  value={promotorSearch}
                  onChange={(e) => setPromotorSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {["Nama Promotor", "SPV", "Area", "Status"].map((h) => (
                        <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {promotorLoading
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i} className="border-b border-border">
                            <td colSpan={4} className="px-3 py-3">
                              <Skeleton className="h-4 w-full" />
                            </td>
                          </tr>
                        ))
                      : filteredPromotor.map((p, i) => (
                          <tr
                            key={i}
                            className="border-b border-border hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-3 py-2.5 font-medium">{p.namaPromotor}</td>
                            <td className="px-3 py-2.5">{p.spv}</td>
                            <td className="px-3 py-2.5">{p.area}</td>
                            <td className="px-3 py-2.5">
                              <Badge
                                variant={p.status === "Active" ? "success" : "secondary"}
                                className="text-xs"
                              >
                                {p.status || "Active"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SPV Table */}
        <TabsContent value="spv" className="mt-4 animate-fade-in">
          <Card>
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search SPV..."
                  className="pl-9 h-9"
                  value={spvSearch}
                  onChange={(e) => setSpvSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {["Nama SPV", "Area"].map((h) => (
                        <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {spvLoading
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="border-b border-border">
                            <td colSpan={2} className="px-3 py-3">
                              <Skeleton className="h-4 w-full" />
                            </td>
                          </tr>
                        ))
                      : filteredSPV.map((s, i) => (
                          <tr
                            key={i}
                            className="border-b border-border hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-3 py-2.5 font-medium">{s.namaSPV}</td>
                            <td className="px-3 py-2.5">{s.area}</td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
