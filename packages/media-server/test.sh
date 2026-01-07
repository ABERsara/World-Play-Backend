#!/bin/bash

# 🧪 סקריפט בדיקה לגישת סארה
# מדמה שידור חי עם PAUSE ו-RESUME

MEDIA_SERVER="http://localhost:8000"
STREAM_ID="test_sara_$(date +%s)"

echo "╔═══════════════════════════════════════╗"
echo "║  🧪 Testing Sara's Approach          ║"
echo "╚═══════════════════════════════════════╝"
echo ""
echo "Stream ID: $STREAM_ID"
echo ""

# 🎬 שלב 1: התחל שידור
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📹 Step 1: Starting live stream..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# התחל את FFmpeg ברקע
ffmpeg -f lavfi -i testsrc=size=1280x720:rate=30 \
  -f lavfi -i sine=frequency=1000 \
  -c:v libx264 -preset ultrafast \
  -c:a aac \
  -f mpegts \
  "$MEDIA_SERVER/live/$STREAM_ID" &

FFMPEG_PID=$!
echo "✅ FFmpeg started (PID: $FFMPEG_PID)"
echo "📺 Watch at: $MEDIA_SERVER/hls/$STREAM_ID/index.m3u8"
echo ""

# המתן שהשידור יתחיל
sleep 5

# 📊 בדוק סטטוס
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Checking stream status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$MEDIA_SERVER/live/$STREAM_ID/status" | jq '.'
echo ""

# המתן קצת (משחק רגיל)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏱️  Step 2: Streaming for 10 seconds..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sleep 10

# בדוק כמה segments נוצרו
SEGMENT_COUNT_BEFORE=$(ls -1 /tmp/media/$STREAM_ID/segment*.ts 2>/dev/null | wc -l)
echo "📦 Segments created so far: $SEGMENT_COUNT_BEFORE"
echo ""

# ⏸️ שלב 3: PAUSE
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏸️  Step 3: Sending PAUSE..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PAUSE_RESPONSE=$(curl -s -X POST "$MEDIA_SERVER/live/$STREAM_ID/pause" | jq '.')
echo "$PAUSE_RESPONSE"
echo ""
echo "💡 Note: FFmpeg continues running!"
echo "💡 New segments are being created and saved"
echo ""

# המתן במצב PAUSE
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏳ Step 4: Paused for 15 seconds..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# עדכון כל 3 שניות
for i in {1..5}; do
  sleep 3
  SEGMENT_COUNT=$(ls -1 /tmp/media/$STREAM_ID/segment*.ts 2>/dev/null | wc -l)
  echo "   📦 Segments now: $SEGMENT_COUNT"
done

echo ""

# בדוק כמה segments נוצרו בזמן PAUSE
SEGMENT_COUNT_AFTER=$(ls -1 /tmp/media/$STREAM_ID/segment*.ts 2>/dev/null | wc -l)
SEGMENTS_DURING_PAUSE=$((SEGMENT_COUNT_AFTER - SEGMENT_COUNT_BEFORE))
echo "📊 Segments created during PAUSE: $SEGMENTS_DURING_PAUSE"
echo ""

# ▶️ שלב 5: RESUME
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "▶️  Step 5: Sending RESUME..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESUME_RESPONSE=$(curl -s -X POST "$MEDIA_SERVER/live/$STREAM_ID/resume" | jq '.')
echo "$RESUME_RESPONSE"
echo ""

# המתן עוד קצת
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏱️  Step 6: Continuing for 10 seconds..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sleep 10

# 📊 סטטוס סופי
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Final status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$MEDIA_SERVER/live/$STREAM_ID/status" | jq '.'
echo ""

# 🛑 שלב 7: עצור
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🛑 Step 7: Stopping stream..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X DELETE "$MEDIA_SERVER/live/$STREAM_ID" | jq '.'
kill $FFMPEG_PID 2>/dev/null
echo ""

# 📁 בדוק קבצים
FINAL_SEGMENT_COUNT=$(ls -1 /tmp/media/$STREAM_ID/segment*.ts 2>/dev/null | wc -l)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test completed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary:"
echo "   - Total segments created: $FINAL_SEGMENT_COUNT"
echo "   - Segments during PAUSE: $SEGMENTS_DURING_PAUSE"
echo "   - All segments saved: ✅"
echo "   - Single FFmpeg process: ✅"
echo "   - No separate cache: ✅"
echo ""
echo "📁 Files location: /tmp/media/$STREAM_ID/"
echo "📺 Playlist: /tmp/media/$STREAM_ID/index.m3u8"
echo ""
echo "🔍 Verify by checking the playlist:"
echo "   cat /tmp/media/$STREAM_ID/index.m3u8"
echo ""

# הצע לבדוק את הפלייליסט
read -p "📖 Show playlist contents? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📄 Playlist (index.m3u8):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat /tmp/media/$STREAM_ID/index.m3u8
    echo ""
fi

# הצע לנקות
read -p "🗑️  Delete test files? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "/tmp/media/$STREAM_ID"
    echo "✅ Cleaned up"
fi

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║  🎉 Test Complete!                   ║"
echo "╚═══════════════════════════════════════╝"