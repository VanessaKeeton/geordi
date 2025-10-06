# 🚀 Geordi Starter Sprint Roadmap  
**Duration:** 3 weeks  
**Goal:** Prove that an AI can *see* a web page and generate an accessible interface from it.  
**Outcome:** A working demo that captures, understands, and interacts with a webpage visually — Geordi’s first spark.

---

## 🧭 Week 1 — Vision In, Vision Out
**Theme:** Teach Geordi to *see*.

### Objectives
- Capture a screenshot of any webpage.
- Send it to a vision-language model.
- Get back structured element data (buttons, links, text).

### Tasks
- [ ] Create a minimal script (Puppeteer or browser extension) to capture screenshots.
- [ ] Call a model API (GPT-4V, Claude 3.5 Vision, etc.) with that image.
- [ ] Parse the model’s response into a JSON format:
  ```json
  [{"type": "button", "label": "Buy Now", "bbox": [320,720,420,750]}]
  ```
- [ ] Save the JSON locally (this is Geordi’s first *perception map*).
- [ ] Document the process in `/docs/perception-demo.md`.

**Definition of Done:**  
Running one command returns usable JSON showing what Geordi sees.

---

## 🧩 Week 2 — Overlay the World
**Theme:** Let users *see what Geordi sees.*

### Objectives
- Visualize the detected UI elements.
- Create an accessible overlay that mirrors what the AI perceives.
- Enable keyboard and (optional) voice navigation.

### Tasks
- [ ] Render bounding boxes or focus outlines on detected elements.
- [ ] Create a keyboard-navigable list of those elements.
- [ ] Add optional text-to-speech feedback (“Button: Buy Now”).
- [ ] Build a simple toggle to enable/disable overlay mode.

**Definition of Done:**  
Pressing a key cycles through detected UI elements, with visible focus and/or spoken feedback.

---

## 🪄 Week 3 — Touch and Talk
**Theme:** Let Geordi *act.*

### Objectives
- Trigger real interactions through the overlay.
- Start connecting perception with real-world function.

### Tasks
- [ ] Map overlay selections to DOM actions (clicks, inputs).
- [ ] Add a simple settings panel (contrast toggle, voice on/off).
- [ ] Build a CLI or popup indicator that says “Geordi is active.”
- [ ] Record a short demo GIF or video.

**Definition of Done:**  
A detected button can be clicked via Geordi’s interface and triggers the real site action.

---

## ✨ Stretch Goals (Optional)
- [ ] Add “summarize this page” feature (vision → summary text).
- [ ] Save and replay user navigation paths.
- [ ] Test on multiple site layouts (simple → complex).
- [ ] Add basic voice commands (“Click Buy Now,” “Next element”).

---

## 🧡 Success Metrics
- ✅ One working demo that runs locally.  
- ✅ One page successfully navigated via overlay.  
- ✅ One person with a screen reader or low-vision setup can confirm: “That helped.”

---

## 📁 Suggested Structure
```
geordi/
├── extension/
├── inference/
├── overlay/
├── docs/
│   ├── perception-demo.md
│   ├── roadmap.md
│   └── vision.md
└── examples/
    └── first_spark/
```

---

## 🗣️ Weekly Intent
- **Week 1:** Geordi *sees.*  
- **Week 2:** Geordi *shows.*  
- **Week 3:** Geordi *acts.*  

That’s it — your first working loop.  
Not a prototype for investors — a *proof of empathy through code.*

---

*“A world where a disability doesn’t mean you can’t.”*
