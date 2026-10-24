# 🔄 AIRelay & Continuity Hub (Model Context Protocol)

Ek advanced tool jo **Multi-AI Project Continuity** ensure karta hai. Jab aik AI (jaise **ChatGPT**) ki message ya rate limit khatam ho jaye, to aap baghair kisi context loss ke **Antigravity**, **OpenCode**, ya **Claude** par switch kar sakte hain aur kaam wahi se shuru hoga jahan pichlay AI ne chhora tha!

---

## 🛑 Problem: AI ki Limit Khatam Hone Ka Masla
1. Aap **ChatGPT (GPT-4o)** ke sath kisi project par kaam kar rahe hain.
2. Achanak ChatGPT kahta hai: *"You've reached your message limit. Try again in 3 hours"*.
3. Aap **Antigravity** ya kisi doosre AI par aate hain, lekin naye AI ko project ke baray me kuch nahi pata hota!
4. Aapko dobara sari files, history, aur context samjhana parta hai jisme 30 minute zaya ho jate hain.

---

## 💡 Solution: AIRelay Kaise Kaam Karta Hai?

Yeh tool aik **Central Brain & Bridge** ki tarah kaam karta hai:

```
[ChatGPT (🛑 Limit Khatam)] 
         ⬇️ (Checkpoint Save / Handoff Brief)
[AIRelay Hub (MCP Server + DB)]
         ⬇️ (Automatic MCP Read / 1-Click Prompt)
[Antigravity / OpenCode (🟢 Resume from Step X)]
```

### 🎯 Key Capabilities:
1. **Rate Limit & Cooldown Tracker:** Tamam models (ChatGPT, Antigravity, OpenCode, Claude) ka status track karta hai.
2. **Checkpoint & Handoff Engine:** 
   - Kya kaam complete ho chuka hai
   - Kaunsi files modify hui hain
   - **Agla step (Pending Task) kya hai jahan se naye AI ko shuru karna hai**
   - Pichlay AI ke special notes
3. **Dual Connection (Universal Bridge):**
   - **Via MCP (Automatic):** OpenCode aur Antigravity seedha `get_latest_handoff` tool call karke context khud read kar lete hain.
   - **Via 1-Click Prompt (Manual / Web):** Web ChatGPT ke liye sirf **"Copy Next AI Prompt"** dabayein aur doosre AI me paste karein.

---

## 🚀 Kaise Use Karein (Workflow)

### Step 1: Web Dashboard Kholein
Browser me open karein: **[http://localhost:3000](http://localhost:3000)**

### Step 2: Jab ChatGPT ki Limit Khatam Ho Jaye
- Dashboard par **"Save Checkpoint"** par click karein (ya ChatGPT se bolein: *"Save handoff checkpoint with pending steps"*).
- Dashboard par **"Copy Next AI Prompt"** ka button dabayein.

### Step 3: Antigravity ya OpenCode Me Paste Karein
Antigravity ya OpenCode ko open karein aur prompt paste kar dein:
```
AI pichlay AI ki chhori hui jagah se exact next step code karna shuru kar dega!
```

---

## ⚡ OpenCode Terminal Integration
OpenCode ke andar yeh MCP already connected hai:
```powershell
# OpenCode ko bolein ke pichlay AI ka context utha kar aage kaam kare:
opencode run "get latest handoff and resume project"
```
