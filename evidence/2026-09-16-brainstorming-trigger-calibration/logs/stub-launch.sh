#!/usr/bin/env bash
E=$(cd "$(dirname "$0")" && pwd)
case "$4" in p1) printf 'arm=%s\nDONE %s %s %s\n' "$1" "$1" "$2" "$4" > "$E/logs/$1-$2-$4.log" ;; p2) exit 3 ;; p3) printf 'arm=%s\nEXIT=9\nFAILED 9\n' "$1" > "$E/logs/$1-$2-$4.log" ;; esac
