import { db } from './firebase';
import { 
  doc, getDoc, setDoc, addDoc, collection, serverTimestamp 
} from 'firebase/firestore';

export const BUILT_IN_TEMPLATES = [
  "Thank you for reaching out. Our team is currently unavailable at the moment. We have received your message and will respond as soon as possible.",
  "Hello and thank you for your message. We are currently assisting other fans. Please hold on while a representative reviews your request.",
  "We appreciate your support. Your message has been received successfully and will be reviewed shortly by our management team.",
  "Thank you for contacting us. We are currently offline, but your message is important to us. We will get back to you as soon as we are available.",
  "Hello! Thank you for reaching out. We are experiencing a high volume of messages at the moment. Please remain patient while we review your inquiry."
];

export async function triggerAutoReply(
  celebrityId: string, 
  fanId: string, 
  chatId: string
) {
  try {
    if (!celebrityId || !fanId || !chatId) return;

    // 1. Fetch automaticReplies configuration
    const configDocRef = doc(db, 'automaticReplies', celebrityId);
    const configSnap = await getDoc(configDocRef);
    if (!configSnap.exists()) return;

    const data = configSnap.data();
    if (!data.enabled) return;

    // 2. Check if fan is target of automatic reply
    const isApplyToAll = data.applyToAll === true;
    const selectedFans = data.selectedFans || [];
    const isFanSelected = selectedFans.includes(fanId);

    if (!isApplyToAll && !isFanSelected) return;

    // 3. Cooldown check (30 minutes)
    const cooldownDocRef = doc(db, 'automaticReplies', celebrityId, 'cooldowns', fanId);
    const cooldownSnap = await getDoc(cooldownDocRef);
    const now = Date.now();
    const thirtyMinutesMs = 30 * 60 * 1000;

    if (cooldownSnap.exists()) {
      const cooldownData = cooldownSnap.data();
      const lastAutoReplyAt = cooldownData.lastAutoReplyAt?.toDate?.()?.getTime() || 0;
      if (now - lastAutoReplyAt < thirtyMinutesMs) {
        console.log(`[AutoReply] Cooldown active for fan ${fanId}. Last reply was less than 30 mins ago.`);
        return;
      }
    }

    // 4. Determine reply text
    let replyText = "";
    if (data.selectedTemplate) {
      if (data.selectedTemplate.startsWith("built-in-")) {
        const index = parseInt(data.selectedTemplate.replace("built-in-", ""), 10);
        replyText = BUILT_IN_TEMPLATES[index] || BUILT_IN_TEMPLATES[0];
      } else {
        // If it is custom, use the customTemplate value
        replyText = data.customTemplate || "";
      }
    }

    // Fallback if empty
    if (!replyText) {
      replyText = BUILT_IN_TEMPLATES[0];
    }

    // 5. Send message (as Celebrity)
    await addDoc(collection(db, `chats/${chatId}/messages`), {
      senderId: celebrityId,
      text: replyText,
      timestamp: serverTimestamp(),
      seen: false
    });

    // 6. Update chat meta
    await setDoc(doc(db, 'chats', chatId), {
      lastMessage: replyText,
      lastTimestamp: serverTimestamp()
    }, { merge: true });

    // 7. Update cooldown record
    await setDoc(cooldownDocRef, {
      fanId,
      lastAutoReplyAt: serverTimestamp()
    });

    console.log(`[AutoReply] Sent reply successfully to fan ${fanId}`);
  } catch (error) {
    console.error("[AutoReply] Error executing automatic reply:", error);
  }
}
