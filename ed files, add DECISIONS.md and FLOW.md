[1mdiff --git a/public/android-chrome-192x192.png b/public/android-chrome-192x192.png[m
[1mindex 417f389..e6943c5 100644[m
Binary files a/public/android-chrome-192x192.png and b/public/android-chrome-192x192.png differ
[1mdiff --git a/public/android-chrome-512x512.png b/public/android-chrome-512x512.png[m
[1mindex 152d459..155c1ce 100644[m
Binary files a/public/android-chrome-512x512.png and b/public/android-chrome-512x512.png differ
[1mdiff --git a/public/apple-touch-icon.png b/public/apple-touch-icon.png[m
[1mindex aa02ce4..7be2f2d 100644[m
Binary files a/public/apple-touch-icon.png and b/public/apple-touch-icon.png differ
[1mdiff --git a/public/favicon-16x16.png b/public/favicon-16x16.png[m
[1mindex a597e63..4c3eab1 100644[m
Binary files a/public/favicon-16x16.png and b/public/favicon-16x16.png differ
[1mdiff --git a/public/favicon-32x32.png b/public/favicon-32x32.png[m
[1mindex 214d75a..31b8831 100644[m
Binary files a/public/favicon-32x32.png and b/public/favicon-32x32.png differ
[1mdiff --git a/public/favicon.ico b/public/favicon.ico[m
[1mindex 952104f..348a220 100644[m
Binary files a/public/favicon.ico and b/public/favicon.ico differ
[1mdiff --git a/public/icons/icon-192.png b/public/icons/icon-192.png[m
[1mindex d4dc4dc..e6943c5 100644[m
Binary files a/public/icons/icon-192.png and b/public/icons/icon-192.png differ
[1mdiff --git a/public/icons/icon-512.png b/public/icons/icon-512.png[m
[1mindex d1e7e7b..155c1ce 100644[m
Binary files a/public/icons/icon-512.png and b/public/icons/icon-512.png differ
[1mdiff --git a/public/icons/logo-mark.png b/public/icons/logo-mark.png[m
[1mindex 4c4debc..84987d4 100644[m
Binary files a/public/icons/logo-mark.png and b/public/icons/logo-mark.png differ
[1mdiff --git a/public/site.webmanifest b/public/site.webmanifest[m
[1mindex 45dc8a2..6f4ad70 100644[m
[1m--- a/public/site.webmanifest[m
[1m+++ b/public/site.webmanifest[m
[36m@@ -1 +1 @@[m
[31m-{"name":"","short_name":"","icons":[{"src":"/android-chrome-192x192.png","sizes":"192x192","type":"image/png"},{"src":"/android-chrome-512x512.png","sizes":"512x512","type":"image/png"}],"theme_color":"#ffffff","background_color":"#ffffff","display":"standalone"}[m
\ No newline at end of file[m
[32m+[m[32m{"name":"ZTE Tracker — Zero to Elite","short_name":"ZTE Tracker","icons":[{"src":"/android-chrome-192x192.png","sizes":"192x192","type":"image/png"},{"src":"/android-chrome-512x512.png","sizes":"512x512","type":"image/png"}],"theme_color":"#0e0e0d","background_color":"#0e0e0d","display":"standalone"}[m
\ No newline at end of file[m
[1mdiff --git a/src/app/layout.tsx b/src/app/layout.tsx[m
[1mindex 14ff695..c6652de 100644[m
[1m--- a/src/app/layout.tsx[m
[1m+++ b/src/app/layout.tsx[m
[36m@@ -19,6 +19,16 @@[m [mexport const metadata: Metadata = {[m
   description:[m
     "Daily execution tracker for the Zero to Elite engineering roadmap. Ship the roadmap, don't just read it.",[m
   manifest: "/manifest.json",[m
[32m+[m[32m  icons: {[m
[32m+[m[32m    icon: [[m
[32m+[m[32m      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },[m
[32m+[m[32m      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },[m
[32m+[m[32m      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },[m
[32m+[m[32m      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },[m
[32m+[m[32m    ],[m
[32m+[m[32m    shortcut: "/favicon.ico",[m
[32m+[m[32m    apple: "/apple-touch-icon.png",[m
[32m+[m[32m  },[m
   appleWebApp: {[m
     capable: true,[m
     statusBarStyle: "black-translucent",[m
[1mdiff --git a/src/app/login/page.tsx b/src/app/login/page.tsx[m
[1mindex 6b3491e..5dbbdef 100644[m
[1m--- a/src/app/login/page.tsx[m
[1m+++ b/src/app/login/page.tsx[m
[36m@@ -1,6 +1,7 @@[m
 "use client";[m
 [m
 import { useState, Suspense } from "react";[m
[32m+[m[32mimport Image from "next/image";[m
 import { useSearchParams } from "next/navigation";[m
 import { createClient } from "@/lib/supabase/clien