"use client";

import React, { useRef, useState } from "react";
import { Camera, Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn, compressImage } from "@/lib/utils";
import { useSettings } from "@/providers/settings-provider";

interface PhotoUploadProps {
  onPhotoChange: (base64: string | null, file: File | null) => void;
  error?: string;
}

export function PhotoUpload({ onPhotoChange, error }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const { settings } = useSettings();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setLoading(true);
    try {
      const compressed = await compressImage(file, settings.imageCompression);
      setPreview(compressed);
      onPhotoChange(compressed, file);
    } catch {
      onPhotoChange(null, null);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setPreview(null);
    onPhotoChange(null, null);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  return (
    <div className="space-y-1.5">
      <Label>
        Photo Documentation <span className="text-destructive">*</span>
      </Label>

      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            onClick={handleClear}
            className="absolute top-2 right-2"
          >
            <X className="h-3 w-3" />
          </Button>
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            Photo ready for upload
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-6 text-center space-y-3",
            error ? "border-destructive" : "border-border hover:border-primary/50",
            "transition-colors"
          )}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Processing image...</p>
            </div>
          ) : (
            <>
              <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Add Photo Documentation</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Camera or Gallery • Auto compressed
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => cameraRef.current?.click()}
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Camera
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Gallery
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Camera input */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {/* File input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
