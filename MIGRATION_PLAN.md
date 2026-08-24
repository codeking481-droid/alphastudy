# Alpha Study — Migration Map & Plan

**Date:** 2026-08-24
**Baseline:** Base44 exported project (114 files, flat root structure)
**Goal:** Migrate from Base44 infrastructure to a fully standalone application while preserving the complete Alpha learning experience.

---

## TABLE OF CONTENTS

1. [File Classification](#1-file-classification)
2. [Base44 Dependency Map](#2-base44-dependency-map)
3. [Database Entity Map](#3-database-entity-map)
4. [AI/LLM Call Map](#4-aillm-call-map)
5. [Authentication Flow Map](#5-authentication-flow-map)
6. [File Upload Map](#6-file-upload-map)
7. [Route Map](#7-route-map)
8. [Deterministic Engine Map](#8-deterministic-engine-map)
9. [Portal Map](#9-portal-map)
10. [State Persistence Map](#10-state-persistence-map)
11. [Environment Variable Map](#11-environment-variable-map)
12. [Broken References Map](#12-broken-references-map)
13. [Dependency Analysis](#13-dependency-analysis)
14. [Migration Phases](#14-migration-phases)

---

## 1. FILE CLASSIFICATION

### Classification Legend

| Code | Meaning |
|------|---------|
| **A** | Must preserve exactly — no changes needed |
| **B** | Preserve logic but adapt infrastructure (replace Base44 calls with new backend) |
| **C** | Base44 adapter — must be fully replaced |
| **D** | Obsolete/unused — can be removed |
| **E** | Uncertain — requires further investigation |

### Complete File Classification

#### Application Logic Files

| File | Class | Rationale |
|------|-------|-----------|
| `alphaEngine.js` | **B** | Core AI orchestration. Preserve system prompt + all JSON schemas. Replace `db.integrations.Core.InvokeLLM` with new LLM provider. |
| `learning.js` | **B** | Learning engine. Preserve all functions. Replace `db.entities.*` with new DB adapter. |
| `mastery.js` | **A** | Pure deterministic logic. Zero dependencies. No changes. |
| `assessment.js` | **A** | Pure deterministic logic. Zero dependencies. No changes. |
| `report.js` | **A** | Pure deterministic logic. Zero dependencies. No changes. |
| `spaced.js` | **A** | Pure deterministic logic. Zero dependencies. No changes. |
| `questions.js` | **B** | Question supply. Preserve logic. Replace `db.entities.*` and `db.integrations.Core.InvokeLLM`. |
| `voice.js` | **A** | Browser-only. Uses `speechSynthesis` and `SpeechRecognition`. No changes. |
| `app-params.js` | **B** | Token/app param management. Replace `VITE_BASE44_*` env vars with new config. |
| `authReturnTo.js` | **A** | Pure logic. URL sanitization. No changes. |
| `query-client.js` | **A** | React Query config. No changes. |
| `utils.js` | **A** | `cn()` utility. No changes. |
| `image-helpers.js` | **A** | Wix media URL transforms. No Base44 dependency (despite the stub). No changes. |
| `index.ts` | **A** | `createPageUrl` utility. No changes. |

#### Component Files

| File | Class | Rationale |
|------|-------|-----------|
| `Home.jsx` | **B** | Main orchestrator. Preserve all logic. Replace `db.entities.*` calls. |
| `ChatInput.jsx` | **B** | Chat input. Replace `db.integrations.Core.UploadFile` and `globalThis.__B44_DB__`. |
| `ChatMessage.jsx` | **A** | Pure UI. No Base44 dependency. No changes. |
| `LessonPortal.jsx` | **A** | Pure UI + imports `teachLesson` from alphaEngine. No direct Base44 calls. |
| `QuestionRunner.jsx` | **A** | Pure UI + imports `fetchQuestions`/`scoreAttempt`. No direct Base44 calls. |
| `PortalRouter.jsx` | **A** | Pure UI. No Base44 dependency. |
| `PortalShell.jsx` | **A** | Pure UI. No Base44 dependency. |
| `ActionCard.jsx` | **A** | Pure UI. No Base44 dependency. |
| `ResultsCard.jsx` | **A** | Pure UI. No Base44 dependency. |
| `Markdown.jsx` | **A** | Pure UI. No Base44 dependency. |
| `Notes.jsx` | **B** | Notes page. Replace `db.entities.Note.*` calls. |
| `AuthContext.jsx` | **B** | Auth context. Replace `db.auth.*` calls and `createAxiosClient`. |
| `ProtectedRoute.jsx` | **A** | Pure UI. Uses `useAuth` hook. No direct Base44 calls. |
| `Login.jsx` | **B** | Login page. Replace `db.auth.*` calls. |
| `Register.jsx` | **B** | Register page. Replace `db.auth.*` calls. |
| `ForgotPassword.jsx` | **B** | Forgot password. Replace `db.auth.resetPasswordRequest`. |
| `ResetPassword.jsx` | **B** | Reset password. Replace `db.auth.resetPassword`. |
| `OAuthConsent.jsx` | **E** | MCP OAuth consent — Base44-specific feature. Needs investigation. |
| `App.jsx` | **A** | Root component. No direct Base44 calls (uses imports that resolve to B-class files). |
| `main.jsx` | **A** | Entry point. No changes. |
| `PageNotFound.jsx` | **B** | Uses `db.auth.me()` for admin check. Replace. |
| `UserNotRegisteredError.jsx` | **A** | Pure UI. No Base44 dependency. |
| `ScrollToTop.jsx` | **A** | Pure UI. No Base44 dependency. |
| `GoogleIcon.jsx` | **A** | Pure UI. No Base44 dependency. |
| `AuthLayout.jsx` | **A** | Pure UI. No Base44 dependency. |

#### UI Component Files (shadcn/ui)

All 40+ shadcn/ui component files are **Class A** — pure UI with zero Base44 dependency:

`accordion.jsx`, `alert-dialog.jsx`, `alert.jsx`, `aspect-ratio.jsx`, `avatar.jsx`, `badge.jsx`, `breadcrumb.jsx`, `button.jsx`, `calendar.jsx`, `card.jsx`, `carousel.jsx`, `chart.jsx`, `checkbox.jsx`, `collapsible.jsx`, `command.jsx`, `context-menu.jsx`, `dialog.jsx`, `drawer.jsx`, `dropdown-menu.jsx`, `form.jsx`, `hover-card.jsx`, `image.jsx`, `input-otp.jsx`, `input.jsx`, `label.jsx`, `menubar.jsx`, `navigation-menu.jsx`, `pagination.jsx`, `popover.jsx`, `progress.jsx`, `radio-group.jsx`, `resizable.jsx`, `scroll-area.jsx`, `select.jsx`, `separator.jsx`, `sheet.jsx`, `sidebar.jsx`, `skeleton.jsx`, `slider.jsx`, `sonner.jsx`, `switch.jsx`, `table.jsx`, `tabs.jsx`, `textarea.jsx`, `toast.jsx`, `toaster.jsx`, `toggle-group.jsx`, `toggle.jsx`, `tooltip.jsx`, `use-mobile.jsx`, `use-size.jsx`, `use-toast.jsx`

**Note:** `image.jsx` and `sidebar.jsx` have the `globalThis.__B44_DB__` stub but never actually use `db` — the stub is harmless dead code.

#### Configuration Files

| File | Class | Rationale |
|------|-------|-----------|
| `vite.config.js` | **C** | Must replace `base44()` plugin with standard Vite config. |
| `package.json` | **B** | Remove `@base44/*` deps, add new deps. Preserve all other deps. |
| `tailwind.config.js` | **A** | No changes. |
| `postcss.config.js` | **A** | No changes. |
| `eslint.config.js` | **A** | No changes. |
| `jsconfig.json` | **B** | Fix `@/*` path alias to match new file structure. |
| `components.json` | **A** | shadcn/ui config. No changes. |
| `index.css` | **A** | CSS variables and Tailwind. No changes. |
| `config.jsonc` | **C** | Base44 project config. Obsolete after migration. |

#### Entity Schema Files

| File | Class | Rationale |
|------|-------|-----------|
| `ConversationMessage.jsonc` | **B** | Schema reference. Adapt to new DB schema definition. |
| `LearningRecord.jsonc` | **B** | Schema reference. Adapt to new DB schema definition. |
| `Mistake.jsonc` | **B** | Schema reference. Adapt to new DB schema definition. |
| `Mission.jsonc` | **B** | Schema reference. Adapt to new DB schema definition. |
| `Note.jsonc` | **B** | Schema reference. Adapt to new DB schema definition. |
| `PortalSession.jsonc` | **B** | Schema reference. Adapt to new DB schema definition. |
| `Question.jsonc` | **B** | Schema reference. Adapt to new DB schema definition. |
| `User.jsonc` | **B** | Schema reference. Adapt to new DB schema definition. |

#### Documentation / Metadata

| File | Class | Rationale |
|------|-------|-----------|
| `README.md` | **C** | Base44-specific instructions. Replace with standalone setup docs. |
| `AGENTS.md` | **C** | Base44 agent instructions. Replace. |
| `CLAUDE.md` | **D** | Just says "See AGENTS.md". Obsolete. |
| `export-report.json` | **D** | Export metadata. Obsolete. |

#### Infrastructure Files

| File | Class | Rationale |
|------|-------|-----------|
| `base44Client.js` | **C** | Stub/mock client. Replace with real API client. |
| `index.html` | **B** | Fix malformed structure (JS before doctype). Remove B44 shim. |

---

## 2. BASE44 DEPENDENCY MAP

### 2.1 `globalThis.__B44_DB__` — 18 files

This is the Base44 SDK runtime injection. Every file that has it includes a fallback mock:
```js
const db = globalThis.__B44_DB__ || { auth:{...}, entities:new Proxy({...}), integrations:{...} };
```

| File | Actually uses `db`? | Operations |
|------|---------------------|------------|
| `alphaEngine.js` | ✅ Yes | `db.integrations.Core.InvokeLLM` |
| `AuthContext.jsx` | ✅ Yes | `db.auth.me()`, `db.auth.logout()`, `db.auth.redirectToLogin()` |
| `ChatInput.jsx` | ✅ Yes | `db.integrations.Core.UploadFile` |
| `ForgotPassword.jsx` | ✅ Yes | `db.auth.resetPasswordRequest()` |
| `Home.jsx` | ✅ Yes | `db.entities.ConversationMessage.*`, `db.entities.Mission.*`, `db.entities.PortalSession.*` |
| `image.jsx` | ❌ No | Stub only — never calls `db` |
| `image-helpers.js` | ❌ No | Stub only — never calls `db` |
| `learning.js` | ✅ Yes | `db.entities.LearningRecord.*`, `db.entities.Mistake.*`, `db.entities.Concept.*`, `db.entities.Note.*` |
| `Login.jsx` | ✅ Yes | `db.auth.loginViaEmailPassword()`, `db.auth.loginWithProvider()` |
| `Notes.jsx` | ✅ Yes | `db.entities.Note.list()`, `db.entities.Note.delete()` |
| `OAuthConsent.jsx` | ✅ Yes | Uses `appParams` (Base44-specific) |
| `PageNotFound.jsx` | ✅ Yes | `db.auth.me()` |
| `questions.js` | ✅ Yes | `db.entities.LearningRecord.filter()`, `db.entities.Question.filter()`, `db.integrations.Core.InvokeLLM` |
| `Register.jsx` | ✅ Yes | `db.auth.register()`, `db.auth.verifyOtp()`, `db.auth.setToken()`, `db.auth.resendOtp()`, `db.auth.loginWithProvider()` |
| `ResetPassword.jsx` | ✅ Yes | `db.auth.resetPassword()` |
| `index.html` | ❌ No | JS shim before doctype — broken HTML |
| `AGENTS.md` | ❌ No | Documentation |
| `README.md` | ❌ No | Documentation |

### 2.2 `@base44/sdk` — package.json

```json
"@base44/sdk": "^0.8.43"
```
Not directly imported in any source file — the SDK injects `globalThis.__B44_DB__` at runtime.

### 2.3 `@base44/vite-plugin` — vite.config.js

```js
import { base44 } from '...'
// ...
plugins: [base44({ legacySDKImports: ..., hmrNotifier: true, ... }), react()]
```
**Note:** The import statement is MISSING from the exported `vite.config.js` — only the usage exists. This is a broken export.

### 2.4 `base44Client.js` — Standalone stub

```js
export const db = { auth: {...}, entities: new Proxy({...}), integrations:{...} };
export const base44 = db;
export default db;
```
This file is NOT imported by any other file. It exists as a reference/export artifact.

---

## 3. DATABASE ENTITY MAP

### 3.1 Entity Schemas (JSONC definitions)

| Entity | JSONC File | Required Fields | Key Fields |
|--------|-----------|-----------------|------------|
| `User` | `User.jsonc` | `role` | role: admin/user |
| `LearningRecord` | `LearningRecord.jsonc` | `concept` | concept, exam, subject, status, attempts, correct, last_score, mastery_score, streak, last_reviewed, next_review, preferred_style, weak_patterns[], seen_questions[] |
| `Mistake` | `Mistake.jsonc` | `concept`, `question_text` | concept, question_text, student_answer, correct_answer, pattern, portal_type |
| `Mission` | `Mission.jsonc` | `goal` | goal, exam, deadline, total_minutes, steps[], current_step, status |
| `Note` | `Note.jsonc` | `title`, `content` | title, content, concept, subject, tags[] |
| `Question` | `Question.jsonc` | `question_text`, `options`, `correct_index`, `provenance` | concept, exam, subject, topic, question_text, options[], correct_index, explanation, difficulty, provenance, source_label |
| `PortalSession` | `PortalSession.jsonc` | `portal_type` | portal_type, concept, config{}, status, result{} |
| `ConversationMessage` | `ConversationMessage.jsonc` | `role`, `content` | role, content, action{}, note_offer{}, report{}, attachments[], kind |
| `Concept` | **MISSING** | — | Referenced in `learning.js` line 12: `db.entities.Concept.list()` but no JSONC schema exists |

### 3.2 Entity Operations — Complete Map

#### ConversationMessage
| Operation | File | Line | Context |
|-----------|------|------|---------|
| `.list("created_date", 200)` | Home.jsx | 46 | Load conversation history |
| `.create({...})` | Home.jsx | 48 | Create initial greeting |
| `.create({...})` | Home.jsx | 65 | Create welcome-back message |
| `.create({...})` | Home.jsx | 103 | Create user message |
| `.create({...})` | Home.jsx | 115 | Create alpha response |
| `.create({...})` | Home.jsx | 125 | Create error message |
| `.create({...})` | Home.jsx | 197 | Create post-portal response |

#### Mission
| Operation | File | Line | Context |
|-----------|------|------|---------|
| `.create({...})` | Home.jsx | 73 | Create mission from welcome-back |
| `.create({...})` | Home.jsx | 139 | Create mission from action |
| `.update(id, {...})` | Home.jsx | 186 | Advance mission step |

#### PortalSession
| Operation | File | Line | Context |
|-----------|------|------|---------|
| `.create({...})` | Home.jsx | 151 | Create portal session |
| `.update(id, {...})` | Home.jsx | 178 | Mark session completed |
| `.update(id, {...})` | Home.jsx | 214 | Mark session abandoned |

#### LearningRecord
| Operation | File | Line | Context |
|-----------|------|------|---------|
| `.list("-updated_date", 200)` | learning.js | 10 | Fetch all learning records |
| `.list("-updated_date", 200)` | learning.js | 120 | Get due reviews |
| `.filter({concept}, "-updated_date", 1)` | learning.js | 49 | Get existing record for concept |
| `.filter({concept}, "-updated_date", 1)` | learning.js | 82 | Get existing record for marking started |
| `.filter({concept}, "-updated_date", 1)` | questions.js | 11 | Get seen questions |
| `.create(payload)` | learning.js | 75 | Create new learning record |
| `.create({...})` | learning.js | 92 | Create learning-started record |
| `.update(id, payload)` | learning.js | 74 | Update learning record |
| `.update(id, {...})` | learning.js | 85 | Mark learning started |

#### Mistake
| Operation | File | Line | Context |
|-----------|------|------|---------|
| `.list("-created_date", 50)` | learning.js | 11 | Fetch all mistakes |
| `.create({...})` | learning.js | 104 | Record a mistake |

#### Concept
| Operation | File | Line | Context |
|-----------|------|------|---------|
| `.list("-created_date", 200)` | learning.js | 12 | Fetch all concepts (for prerequisite lookup) |

#### Note
| Operation | File | Line | Context |
|-----------|------|------|---------|
| `.list("-created_date", 200)` | Notes.jsx | 15 | List all notes |
| `.create(note)` | learning.js | 116 | Save a note |
| `.delete(id)` | Notes.jsx | 20 | Delete a note |

#### Question
| Operation | File | Line | Context |
|-----------|------|------|---------|
| `.filter({concept}, "-created_date", 100)` | questions.js | 13 | Fetch questions for concept |

#### User
| Operation | File | Line | Context |
|-----------|------|------|---------|
| (none) | — | — | Schema exists but no direct entity operations found. Auth handled via `db.auth.*`. |

### 3.3 SDK API Signature (to replicate)

The Base44 SDK entity API uses this pattern:
```js
// List with sort and limit
db.entities.EntityName.list(sortField, limit)

// Filter with query, sort, and limit
db.entities.EntityName.filter(queryObject, sortField, limit)

// Get by ID
db.entities.EntityName.get(id)

// Create
db.entities.EntityName.create(dataObject) → returns created object with id

// Update
db.entities.EntityName.update(id, dataObject) → returns updated object

// Delete
db.entities.EntityName.delete(id)
```

---

## 4. AI/LLM CALL MAP

### 4.1 All LLM Call Sites

#### Call 1: `getAlphaResponse()` — Main conversational AI
**File:** `alphaEngine.js` line 113
**Input contract:**
```js
{
  prompt: string,           // System prompt + student memory + conversation history + user message
  response_json_schema: {   // Enforced JSON output
    type: "object",
    properties: {
      reply: { type: "string" },
      action: { type: ["object", "null"], properties: { type, portal, title, cta, concept, subject, exam, question_count, duration_minutes, difficulty, pattern, style, mission } },
      note_offer: { type: ["object", "null"], properties: { title, content, concept } }
    },
    required: ["reply"]
  },
  file_urls: string[]       // Optional: image/document URLs for multimodal analysis
}
```
**Output contract:** `{ reply: string, action: object|null, note_offer: object|null }`

#### Call 2: `analyzeResult()` — Post-portal analysis
**File:** `alphaEngine.js` line 146
**Input contract:**
```js
{
  prompt: string,           // System prompt + portal result evidence + memory + mission state
  response_json_schema: {
    type: "object",
    properties: {
      reply: { type: "string" },
      action: { type: ["object", "null"], properties: { ...same actionProps } }
    },
    required: ["reply"]
  }
}
```
**Output contract:** `{ reply: string, action: object|null }`

#### Call 3: `teachLesson()` — Lesson generation
**File:** `alphaEngine.js` line 158
**Input contract:**
```js
{
  prompt: string,           // "Teach the concept X in Y for Z..."
  response_json_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      analogy: { type: "string" },
      explanation: { type: "string" },
      key_points: { type: "array", items: { type: "string" } },
      example: { type: "string" },
      check_question: { type: "string" },
      check_options: { type: "array", items: { type: "string" } },
      check_correct_index: { type: "integer" },
      check_explanation: { type: "string" },
      compare: { type: "string" },
      common_mistakes: { type: "array", items: { type: "string" } },
      memory_hook: { type: "string" },
      exam_tip: { type: "string" }
    },
    required: ["title", "explanation"]
  }
}
```
**Output contract:** `{ title, analogy, explanation, key_points[], example, check_question, check_options[], check_correct_index, check_explanation, compare, common_mistakes[], memory_hook, exam_tip }`

#### Call 4: `welcomeBack()` — Returning student greeting
**File:** `alphaEngine.js` line 194
**Input contract:**
```js
{
  prompt: string,           // System prompt + student evidence + due reviews
  response_json_schema: {
    type: "object",
    properties: {
      reply: { type: "string" },
      action: { type: ["object", "null"], properties: { ...same actionProps } }
    },
    required: ["reply"]
  }
}
```
**Output contract:** `{ reply: string, action: object|null }`

#### Call 5: `generateQuestions()` — Question generation
**File:** `questions.js` line 30
**Input contract:**
```js
{
  prompt: string,           // "Generate N questions on concept X..."
  response_json_schema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question_text: { type: "string" },
            options: { type: "array", items: { type: "string" } },
            correct_index: { type: "integer" },
            explanation: { type: "string" },
            difficulty: { type: "string" }
          },
          required: ["question_text", "options", "correct_index"]
        }
      }
    },
    required: ["questions"]
  }
}
```
**Output contract:** `{ questions: [{ question_text, options[], correct_index, explanation, difficulty }] }`

### 4.2 LLM Provider Requirements

The replacement LLM provider must support:
1. **Structured JSON output** via `response_json_schema` (OpenAI-style function calling or JSON mode)
2. **Multimodal input** (file URLs for image/document analysis — Call 1 only)
3. **Long context** (system prompt is ~3,000 tokens + conversation history + memory)
4. **Reliable JSON parsing** (every call expects valid JSON back)

---

## 5. AUTHENTICATION FLOW MAP

### 5.1 Complete Auth Flows

#### Flow 1: Email/Password Login
**File:** `Login.jsx`
```
User submits email + password
→ db.auth.loginViaEmailPassword(email, password)
→ On success: window.location.href = returnTo
→ On failure: show error message
```

#### Flow 2: Google OAuth Login
**File:** `Login.jsx`
```
User clicks "Continue with Google"
→ db.auth.loginWithProvider("google", returnTo)
→ Base44 handles OAuth redirect
```

#### Flow 3: Registration + OTP Verification
**File:** `Register.jsx`
```
Step 1: User submits email + password
→ db.auth.register({ email, password })
→ Show OTP input

Step 2: User enters 6-digit OTP
→ db.auth.verifyOtp({ email, otpCode })
→ If result.access_token: db.auth.setToken(result.access_token)
→ window.location.href = returnTo

Step 3: Resend OTP (optional)
→ db.auth.resendOtp(email)
```

#### Flow 4: Forgot Password
**File:** `ForgotPassword.jsx`
```
User submits email
→ db.auth.resetPasswordRequest(email)
→ Show "check your email" message
```

#### Flow 5: Reset Password
**File:** `ResetPassword.jsx`
```
User arrives with ?token=xxx
→ User submits new password + confirm
→ db.auth.resetPassword({ resetToken, newPassword })
→ Redirect to /login
```

#### Flow 6: App State Check (AuthContext)
**File:** `AuthContext.jsx`
```
On mount:
→ createAxiosClient({ baseURL: '/api/apps/public', ... })  // BROKEN REFERENCE
→ GET /api/apps/public/prod/public-settings/by-id/${appId}
→ If 403 with reason 'auth_required': set auth error
→ If 403 with reason 'user_not_registered': set user_not_registered error
→ If has token: db.auth.me() → set user
```

#### Flow 7: OAuth Consent (MCP)
**File:** `OAuthConsent.jsx`
```
→ Fetch /api/apps/${appId}/mcp/consent-info?handle=${ctx}
→ If not authenticated: redirect to login
→ Show tool list → User approves/denies
→ POST /api/apps/${appId}/mcp/authorize-grant
→ Redirect to client
```
**Note:** This is Base44 MCP-specific. May not be needed in standalone version.

### 5.2 Auth SDK Methods Required

| Method | Used In | Purpose |
|--------|---------|---------|
| `loginViaEmailPassword(email, password)` | Login.jsx | Email/password auth |
| `register({ email, password })` | Register.jsx | Create account |
| `verifyOtp({ email, otpCode })` | Register.jsx | Verify email OTP |
| `resendOtp(email)` | Register.jsx | Resend OTP code |
| `setToken(token)` | Register.jsx | Store auth token |
| `loginWithProvider(provider, returnTo)` | Login.jsx, Register.jsx | OAuth redirect |
| `resetPasswordRequest(email)` | ForgotPassword.jsx | Request password reset |
| `resetPassword({ resetToken, newPassword })` | ResetPassword.jsx | Reset with token |
| `me()` | AuthContext.jsx, PageNotFound.jsx | Get current user |
| `logout(redirect?)` | AuthContext.jsx | Clear session |
| `redirectToLogin(returnTo)` | AuthContext.jsx | Redirect to login |
| `isAuthenticated()` | (referenced in comments) | Check auth status |

---

## 6. FILE UPLOAD MAP

### 6.1 Upload Operations

| File | Line | Operation | Input | Output |
|------|------|-----------|-------|--------|
| `ChatInput.jsx` | 28 | `db.integrations.Core.UploadFile({ file })` | File object (image/*, application/pdf, .txt, .docx) | `{ file_url: string }` |

### 6.2 Upload Flow
```
User selects files via file input
→ For each file:
  → db.integrations.Core.UploadFile({ file })
  → Returns { file_url: string }
  → Add to pending attachments array
→ When user sends message:
  → onSend(text, pending.map(p => p.url))
  → URLs passed to getAlphaResponse() as attachments parameter
  → Passed to InvokeLLM as file_urls parameter
```

### 6.3 Replacement Requirements
- Must accept File objects
- Must return `{ file_url: string }` (or equivalent URL)
- Must support: images, PDFs, .txt, .docx
- URLs must be accessible by the LLM provider for multimodal analysis

---

## 7. ROUTE MAP

### 7.1 All Routes

| Route | Component | Auth Required | Base44 Deps |
|-------|-----------|---------------|-------------|
| `/` | `Home` | ✅ Yes | `db.entities.ConversationMessage.*`, `db.entities.Mission.*`, `db.entities.PortalSession.*` |
| `/notes` | `Notes` | ✅ Yes | `db.entities.Note.*` |
| `/login` | `Login` | ❌ No | `db.auth.*` |
| `/register` | `Register` | ❌ No | `db.auth.*` |
| `/forgot-password` | `ForgotPassword` | ❌ No | `db.auth.resetPasswordRequest` |
| `/reset-password` | `ResetPassword` | ❌ No | `db.auth.resetPassword` |
| `*` | `PageNotFound` | ❌ No | `db.auth.me()` (admin check) |

### 7.2 Route Dependencies
```
App.jsx
├── AuthProvider (AuthContext.jsx) ← db.auth.*
├── QueryClientProvider
├── BrowserRouter
│   ├── /login → Login.jsx ← db.auth.*
│   ├── /register → Register.jsx ← db.auth.*
│   ├── /forgot-password → ForgotPassword.jsx ← db.auth.*
│   ├── /reset-password → ResetPassword.jsx ← db.auth.*
│   └── ProtectedRoute ← useAuth()
│       ├── / → Home.jsx ← db.entities.*
│       └── /notes → Notes.jsx ← db.entities.*
└── * → PageNotFound.jsx ← db.auth.me()
```

---

## 8. DETERMINISTIC ENGINE MAP

### 8.1 Pure Logic Modules (Zero Base44 Dependency)

These files are **completely portable** — no changes needed:

#### `mastery.js`
- `computeMastery(record)` → number (0-100)
  - Formula: `accuracy*0.4 + volume*0.15 + streak*0.2 + lastScore*0.25`
- `isMastered(record)` → boolean
  - Threshold: mastery≥80, attempts≥5, lastScore≥70, no weak_patterns

#### `assessment.js`
- `scoreAttempt(questions, answers)` → `{ total, correct, unanswered, score, mistakes[] }`
- `inferPattern(mistake)` → string (pattern name)
  - Patterns: sign_error, formula_confusion, misreading, concept_confusion

#### `report.js`
- `buildEvidenceReport(config, result, prevRecord)` → evidence object
  - Computes: patterns, avgTimeSec, timeProblem, improvement, readyForHarder, knowledgeState

#### `spaced.js`
- `scheduleNextReview(score, prevNext)` → ISO date string
  - Intervals: [1, 3, 7, 16, 35] days based on score thresholds

### 8.2 Engine Data Flow
```
QuestionRunner
  → fetchQuestions() [needs db]
  → scoreAttempt() [PURE]
  → onComplete(result)

Home.jsx handlePortalComplete
  → fetchMemory() [needs db]
  → recordAttempt() [needs db]
  → recordMistakes() [needs db]
  → markLearningStarted() [needs db]
  → buildEvidenceReport() [PURE]
  → getAlphaResponse() / analyzeResult() [needs LLM]
```

---

## 9. PORTAL MAP

### 9.1 All Portal Types

| Portal | Component | Timed | Questions | Duration | Tutor | Special |
|--------|-----------|-------|-----------|----------|-------|---------|
| `lesson` | LessonPortal | No | 0 (1 check) | ~5min | N/A | AI-generated teaching content |
| `quiz` | QuestionRunner | ✅ | 8-12 | 10min | ✅ | Standard assessment |
| `practice` | QuestionRunner | ❌ | 8 | untimed | ✅ | No time pressure |
| `diagnostic` | QuestionRunner | ✅ | 10 | 12min | ✅ | Find weak spots |
| `exam` | QuestionRunner | ✅ | 20-40 | 20-40min | ❌ | No hints, strict |
| `review` | QuestionRunner | ✅ | 6 | 8min | ✅ | Spaced review |
| `challenge` | QuestionRunner | ✅ | 5 | 10min | ✅ | Harder questions |
| `mistake_clinic` | QuestionRunner | ✅ | varies | varies | ✅ | Pattern-targeted |
| `mastery_check` | QuestionRunner | ✅ | 8 | 12min | ❌ | No hints, confirm mastery |

### 9.2 Portal Lifecycle
```
Alpha decides action → ActionCard rendered
→ User clicks "Start"
→ handleAction() in Home.jsx
  → Creates PortalSession entity
  → Sets activePortal state
→ PortalRouter renders appropriate portal
→ User completes portal
→ handlePortalComplete() in Home.jsx
  → Records attempt, mistakes
  → Builds evidence report
  → Updates PortalSession
  → Advances Mission if active
  → Calls analyzeResult() for AI follow-up
  → Creates ConversationMessage with response
```

---

## 10. STATE PERSISTENCE MAP

### 10.1 Student State (persisted to DB)

| State | Entity | Created In | Updated In | Read In |
|-------|--------|------------|------------|---------|
| Learning progress per concept | LearningRecord | learning.js | learning.js | learning.js, questions.js |
| Mistake patterns | Mistake | learning.js | — | learning.js |
| Study missions | Mission | Home.jsx | Home.jsx | Home.jsx |
| Portal sessions | PortalSession | Home.jsx | Home.jsx | Home.jsx |
| Student notes | Note | learning.js | — | Notes.jsx |
| Question bank | Question | (seeded/AI-generated) | — | questions.js |
| Concept prerequisites | Concept | (seeded) | — | learning.js |

### 10.2 Conversation State (persisted to DB)

| State | Entity | Created In | Read In |
|-------|--------|------------|---------|
| Chat messages | ConversationMessage | Home.jsx | Home.jsx |
| Message actions | ConversationMessage.action | Home.jsx | ChatMessage.jsx → ActionCard |
| Message reports | ConversationMessage.report | Home.jsx | ChatMessage.jsx → ResultsCard |
| Note offers | ConversationMessage.note_offer | Home.jsx | ChatMessage.jsx |
| Attachments | ConversationMessage.attachments | Home.jsx | ChatMessage.jsx → Image |

### 10.3 Client-Only State (not persisted)

| State | Location |
|-------|----------|
| Active portal | Home.jsx (`activePortal`) |
| TTS toggle | Home.jsx (`ttsOn`) |
| Due reviews list | Home.jsx (`dueReviews`) |
| Active mission | Home.jsx (`activeMission`) |
| Chat input text | ChatInput.jsx (`text`, `pending`) |
| Question answers | QuestionRunner.jsx (`answers`, `idx`) |
| Timer state | QuestionRunner.jsx (`timeLeft`) |
| Confidence rating | QuestionRunner.jsx (`confidence`) |

---

## 11. ENVIRONMENT VARIABLE MAP

### 11.1 Current Base44 Variables

| Variable | Used In | Purpose |
|----------|---------|---------|
| `VITE_BASE44_APP_ID` | app-params.js | Base44 app identifier |
| `VITE_BASE44_APP_BASE_URL` | app-params.js | Base44 backend URL |
| `VITE_BASE44_FUNCTIONS_VERSION` | app-params.js | Functions version |
| `BASE44_LEGACY_SDK_IMPORTS` | vite.config.js | Legacy import support |

### 11.2 Required Standalone Variables (to create)

| Variable | Purpose | Phase |
|----------|---------|-------|
| `VITE_API_URL` | Backend API base URL | Phase 1 |
| `VITE_LLM_PROVIDER` | LLM provider identifier | Phase 4 |
| `VITE_LLM_API_KEY` | LLM API key (or server-side) | Phase 4 |
| `VITE_LLM_MODEL` | Model name | Phase 4 |
| `VITE_STORAGE_URL` | File storage base URL | Phase 5 |
| `DATABASE_URL` | Database connection (server-side) | Phase 2 |
| `JWT_SECRET` | Auth token secret (server-side) | Phase 3 |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Email for OTP/reset (server-side) | Phase 3 |

---

## 12. BROKEN REFERENCES MAP

### 12.1 Critical Broken References

| File | Line | Issue | Severity |
|------|------|-------|----------|
| `AuthContext.jsx` | 29 | `createAxiosClient` — used but never imported. Likely a Base44 SDK global. | 🔴 Critical |
| `vite.config.js` | 8 | `base44` — imported but import statement missing from export | 🔴 Critical |
| `index.html` | 1 | `const db = ...` JavaScript before `<!doctype html>` — malformed HTML | 🔴 Critical |
| `index.html` | 13 | `<script src="/src/main.jsx">` — no `src/` directory exists | 🔴 Critical |

### 12.2 Path Alias Mismatches

The `@/*` alias maps to `./src/*` (jsconfig.json), but files are in root:

| Import | Expected Path | Actual Path |
|--------|---------------|-------------|
| `@/components/ui/*` | `src/components/ui/*` | `*.jsx` (root) |
| `@/components/alpha/*` | `src/components/alpha/*` | `ChatMessage.jsx`, `ChatInput.jsx`, `Markdown.jsx` (root) |
| `@/components/portals/*` | `src/components/portals/*` | `PortalRouter.jsx`, etc. (root) |
| `@/components/*` | `src/components/*` | `AuthLayout.jsx`, etc. (root) |
| `@/lib/*` | `src/lib/*` | `alphaEngine.js`, `learning.js`, etc. (root) |
| `@/pages/*` | `src/pages/*` | `Home.jsx`, `Login.jsx`, etc. (root) |
| `@/hooks/*` | `src/hooks/*` | `use-mobile.jsx`, `use-size.jsx` (root) |

### 12.3 Missing Entity Schema

| Entity | Referenced In | Issue |
|--------|---------------|-------|
| `Concept` | learning.js line 12 | `db.entities.Concept.list()` called but no `Concept.jsonc` exists |

---

## 13. DEPENDENCY ANALYSIS

### 13.1 Unused Dependencies (safe to remove later)

| Package | Reason |
|---------|--------|
| `three` | Three.js — zero imports in codebase |
| `react-leaflet` | Map component — zero imports in codebase |
| `@stripe/react-stripe-js` | Stripe React — zero imports in codebase |
| `@stripe/stripe-js` | Stripe JS — zero imports in codebase |
| `canvas-confetti` | Confetti effect — zero imports in codebase |
| `html2canvas` | Screenshot — zero imports in codebase |
| `jspdf` | PDF generation — zero imports in codebase |
| `react-quill-new` | Rich text editor — zero imports in codebase |
| `react-resizable-panels` | Resizable panels — zero imports in codebase |
| `react-day-picker` | Date picker — zero imports in codebase (used by calendar.jsx but calendar not used) |
| `embla-carousel-react` | Carousel — imported by carousel.jsx but carousel not used in app |
| `cmdk` | Command palette — imported by command.jsx but command not used in app |
| `@hello-pangea/dnd` | Drag and drop — zero imports in codebase |
| `next-themes` | Theme switching — zero imports in codebase |
| `sonner` | Toast — zero imports in codebase (app uses custom toast) |

### 13.2 Required Dependencies (must keep)

| Package | Used By |
|---------|---------|
| `react`, `react-dom` | Core framework |
| `react-router-dom` | Routing |
| `@tanstack/react-query` | Data fetching |
| `@radix-ui/*` (all) | UI components (shadcn/ui) |
| `class-variance-authority` | Component variants |
| `clsx` | Class names |
| `tailwind-merge` | Tailwind class merging |
| `tailwindcss-animate` | Animations |
| `lucide-react` | Icons |
| `framer-motion` | Animations |
| `react-markdown` | Markdown rendering |
| `zod` | Schema validation |
| `date-fns` | Date utilities |
| `lodash` | Utility functions |
| `moment` | Date utilities |
| `vite`, `@vitejs/plugin-react` | Build tooling |
| `tailwindcss`, `postcss`, `autoprefixer` | CSS tooling |
| `eslint*` | Linting |
| `typescript` | Type checking (jsconfig) |

### 13.3 Dependencies to Remove

| Package | Reason |
|---------|--------|
| `@base44/sdk` | Base44 SDK — replacing |
| `@base44/vite-plugin` | Base44 Vite plugin — replacing |

### 13.4 Dependencies to Add (per phase)

| Phase | Package | Purpose |
|-------|---------|---------|
| 1 | `axios` or `@tanstack/react-query` fetch | HTTP client |
| 2 | `pg` / `prisma` / `drizzle` / `mongoose` | Database ORM |
| 3 | `jsonwebtoken`, `bcrypt` / auth library | Auth |
| 4 | `openai` / `anthropic` / LLM SDK | LLM provider |
| 5 | `@aws-sdk/client-s3` / storage SDK | File storage |

---

## 14. MIGRATION PHASES

---

### PHASE 0 — Repository Stabilization

**Goal:** Make the frontend buildable and runnable with the mock/stub backend.

**Files Involved:**
- `index.html` — Remove B44 JS shim, fix doctype
- `vite.config.js` — Remove base44 plugin, add path alias
- `jsconfig.json` — Fix `@/*` path mapping
- `main.jsx` — Verify entry point
- `package.json` — Remove `@base44/*` deps

**What Must Remain Unchanged:**
- All application logic files (alphaEngine.js, learning.js, mastery.js, etc.)
- All UI components
- All entity schemas

**What Will Be Replaced:**
- `vite.config.js`: Remove `base44()` plugin call, add `resolve.alias` for `@/`
- `index.html`: Remove line 1 JS shim, fix structure
- `jsconfig.json`: Update path alias from `./src/*` to `./*`

**Risks:**
- Import path resolution may break if alias not configured correctly
- Some components may have hidden Base44 runtime dependencies

**Verification Tests:**
1. `npm run build` completes without errors
2. `npm run dev` starts Vite dev server
3. App renders in browser (shows login page or loading state)
4. No console errors related to missing modules

---

### PHASE 1 — Application Infrastructure

**Goal:** Create a backend API server and connect the frontend to it.

**Files Involved:**
- New: `server/` directory with Express/Fastify
- New: `server/api/` — REST/GraphQL endpoints
- New: `server/middleware/` — auth, CORS, etc.
- `app-params.js` — Update env var references
- `base44Client.js` — Replace with real API client
- All files with `globalThis.__B44_DB__` — Replace stub with real client

**What Must Remain Unchanged:**
- All learning engine logic
- All UI components
- All portal components

**What Will Be Replaced:**
- `globalThis.__B44_DB__` stub → real API client
- `base44Client.js` → new `apiClient.js`
- Base44 env vars → new env vars

**Risks:**
- API contract must match what frontend expects
- CORS configuration needed for dev

**Verification Tests:**
1. Server starts independently
2. Frontend can reach backend API
3. Health check endpoint responds

---

### PHASE 2 — Database

**Goal:** Set up database with all entity schemas and CRUD operations.

**Files Involved:**
- New: `server/db/` — Database schema, migrations, seed data
- New: `server/db/schema.sql` or ORM schema
- All JSONC files — Reference for schema design
- `learning.js` — Will call new DB adapter
- `questions.js` — Will call new DB adapter
- `Home.jsx` — Will call new DB adapter
- `Notes.jsx` — Will call new DB adapter

**Entities to Create:**
1. `users` — id, email, password_hash, role, created_at, updated_at
2. `learning_records` — id, user_id, concept, exam, subject, status, attempts, correct, last_score, mastery_score, streak, last_reviewed, next_review, preferred_style, weak_patterns, seen_questions, created_at, updated_at
3. `mistakes` — id, user_id, concept, question_text, student_answer, correct_answer, pattern, portal_type, created_at
4. `missions` — id, user_id, goal, exam, deadline, total_minutes, steps, current_step, status, created_at, updated_at
5. `notes` — id, user_id, title, content, concept, subject, tags, created_at
6. `questions` — id, concept, exam, subject, topic, question_text, options, correct_index, explanation, difficulty, provenance, source_label, created_at
7. `portal_sessions` — id, user_id, portal_type, concept, config, status, result, created_at, updated_at
8. `conversation_messages` — id, user_id, role, content, action, note_offer, report, attachments, kind, created_date
9. `concepts` — id, concept, subject, exam, prerequisites, created_at

**API Endpoints Needed:**
```
GET    /api/entities/:entityName/list?sort=&limit=
GET    /api/entities/:entityName/filter?query=&sort=&limit=
POST   /api/entities/:entityName/create
PUT    /api/entities/:entityName/:id/update
DELETE /api/entities/:entityName/:id/delete
```

**What Must Remain Unchanged:**
- All entity field names and types (matching JSONC schemas)
- All sort field conventions (prefix `-` for descending)
- All filter query patterns

**What Will Be Replaced:**
- `db.entities.*` calls → HTTP API calls to new backend

**Risks:**
- Schema migration from Base44 data (if any existing data)
- Query pattern compatibility (`.list()`, `.filter()`, `.create()`, `.update()`, `.delete()`)

**Verification Tests:**
1. All CRUD operations work for each entity
2. Sort and filter queries return correct results
3. Foreign key relationships work (user_id on all entities)
4. Seed data loads correctly

---

### PHASE 3 — Authentication

**Goal:** Implement standalone authentication with email/password, OTP, and Google OAuth.

**Files Involved:**
- New: `server/auth/` — Auth routes, JWT, OTP, password reset
- `AuthContext.jsx` — Replace `db.auth.*` with new auth API
- `Login.jsx` — Replace `db.auth.*` with new auth API
- `Register.jsx` — Replace `db.auth.*` with new auth API
- `ForgotPassword.jsx` — Replace `db.auth.resetPasswordRequest`
- `ResetPassword.jsx` — Replace `db.auth.resetPassword`
- `PageNotFound.jsx` — Replace `db.auth.me()`
- `app-params.js` — Update token management

**Auth Methods to Implement:**
1. `loginViaEmailPassword(email, password)` → POST /api/auth/login
2. `register({ email, password })` → POST /api/auth/register
3. `verifyOtp({ email, otpCode })` → POST /api/auth/verify-otp
4. `resendOtp(email)` → POST /api/auth/resend-otp
5. `setToken(token)` → localStorage management
6. `loginWithProvider(provider, returnTo)` → GET /api/auth/google (OAuth redirect)
7. `resetPasswordRequest(email)` → POST /api/auth/forgot-password
8. `resetPassword({ resetToken, newPassword })` → POST /api/auth/reset-password
9. `me()` → GET /api/auth/me
10. `logout(redirect?)` → POST /api/auth/logout + clear token
11. `redirectToLogin(returnTo)` → window.location = /login?returnTo=...

**What Must Remain Unchanged:**
- Auth UI components (Login, Register, ForgotPassword, ResetPassword)
- ProtectedRoute logic
- AuthContext provider pattern
- OTP verification flow UI

**What Will Be Replaced:**
- All `db.auth.*` method implementations
- Token storage mechanism
- OAuth redirect handling

**Risks:**
- Google OAuth requires Google Cloud Console setup
- Email OTP requires SMTP service
- JWT token format must be compatible

**Verification Tests:**
1. Register with email → receive OTP → verify → logged in
2. Login with email/password → redirected to /
3. Google OAuth → redirected back → logged in
4. Forgot password → receive email → reset → login with new password
5. Protected routes redirect to /login when unauthenticated
6. Token refresh/expiry handling

---

### PHASE 4 — AI Provider

**Goal:** Replace Base44 LLM integration with direct LLM provider API.

**Files Involved:**
- New: `server/llm/` — LLM provider adapter
- `alphaEngine.js` — Replace `db.integrations.Core.InvokeLLM`
- `questions.js` — Replace `db.integrations.Core.InvokeLLM`

**LLM Calls to Migrate:**

| Call | Location | Input | Output |
|------|----------|-------|--------|
| `getAlphaResponse` | alphaEngine.js:113 | prompt + response_json_schema + file_urls | `{ reply, action, note_offer }` |
| `analyzeResult` | alphaEngine.js:146 | prompt + response_json_schema | `{ reply, action }` |
| `teachLesson` | alphaEngine.js:158 | prompt + response_json_schema | `{ title, analogy, explanation, ... }` |
| `welcomeBack` | alphaEngine.js:194 | prompt + response_json_schema | `{ reply, action }` |
| `generateQuestions` | questions.js:30 | prompt + response_json_schema | `{ questions: [...] }` |

**Provider Requirements:**
1. Structured JSON output (OpenAI function calling or JSON mode)
2. Multimodal support (for file_urls in getAlphaResponse)
3. Long context window (system prompt ~3K tokens + history)
4. Reliable JSON parsing

**Recommended Provider Options:**
- OpenAI GPT-4o (best JSON mode + multimodal)
- Anthropic Claude (excellent structured output)
- Google Gemini (multimodal + structured output)

**What Must Remain Unchanged:**
- ALL system prompts in alphaEngine.js
- ALL response_json_schema definitions
- ALL actionProps definitions
- The complete SYSTEM prompt text (~3,000 tokens)

**What Will Be Replaced:**
- `db.integrations.Core.InvokeLLM({...})` → `llmProvider.chat.completions.create({...})`
- Response parsing (Base44 wraps LLM response)

**Risks:**
- LLM response format differences between providers
- JSON mode reliability varies by provider
- Multimodal file handling differs (URLs vs base64)
- Cost implications of long system prompts

**Verification Tests:**
1. `getAlphaResponse` returns valid JSON with reply
2. `analyzeResult` returns valid JSON with reply + action
3. `teachLesson` returns structured lesson object
4. `welcomeBack` returns greeting with optional action
5. `generateQuestions` returns array of valid MCQs
6. File upload → LLM multimodal analysis works
7. All response schemas match expected shapes

---

### PHASE 5 — File Storage

**Goal:** Replace Base44 file upload with standalone storage.

**Files Involved:**
- New: `server/storage/` — File upload handler
- `ChatInput.jsx` — Replace `db.integrations.Core.UploadFile`

**Upload Flow to Migrate:**
```
ChatInput.jsx:28 → db.integrations.Core.UploadFile({ file }) → { file_url }
```

**Replacement Options:**
1. **Local filesystem** (simple, not scalable)
2. **AWS S3** (production-grade)
3. **Cloudinary** (optimized for images)
4. **Supabase Storage** (if using Supabase)
5. **MinIO** (self-hosted S3-compatible)

**What Must Remain Unchanged:**
- File input accepts: image/*, application/pdf, .txt, .docx
- Upload returns `{ file_url: string }`
- URLs are accessible by LLM provider for analysis

**What Will Be Replaced:**
- `db.integrations.Core.UploadFile({ file })` → `fetch('/api/upload', { method: 'POST', body: formData })`

**Risks:**
- File size limits
- URL accessibility for LLM multimodal
- Storage costs

**Verification Tests:**
1. Upload image → returns accessible URL
2. Upload PDF → returns accessible URL
3. URLs work in LLM multimodal analysis
4. File size limits enforced

---

### PHASE 6 — Question/Curriculum System

**Goal:** Seed question bank and curriculum data.

**Files Involved:**
- New: `server/db/seed/` — Seed scripts
- `questions.js` — Verify fallback generation works
- New: `Concept.jsonc` — Create missing schema

**Seed Data Needed:**

1. **Concepts** (with prerequisites):
   ```json
   {
     "concept": "Quadratic Equations",
     "subject": "Mathematics",
     "exam": "JAMB",
     "prerequisites": ["Linear Equations", "Algebra Basics"]
   }
   ```

2. **Questions** (pre-seeded for key topics):
   - JAMB Mathematics topics
   - WAEC Mathematics topics
   - NECO Mathematics topics
   - Sciences, English, etc.

3. **Curriculum structure**:
   - Subject → Topic → Concept hierarchy
   - Prerequisite relationships
   - Difficulty progression

**What Must Remain Unchanged:**
- `fetchQuestions()` logic (filter by concept, exclude seen, fallback to AI)
- `generateQuestions()` AI fallback
- Question schema (provenance, source_label)
- Honest labeling (AI-generated vs official)

**What Will Be Replaced:**
- `db.entities.Concept.list()` → new DB query
- `db.entities.Question.filter()` → new DB query

**Risks:**
- Curriculum accuracy (JAMB/WAEC/NECO syllabus)
- Question quality for AI-generated fallback
- Concept prerequisite graph completeness

**Verification Tests:**
1. Seeded questions load correctly
2. Concept prerequisite lookup works
3. AI-generated fallback produces valid questions
4. Question deduplication (seen_questions) works

---

### PHASE 7 — Full Alpha Integration

**Goal:** End-to-end integration of all systems.

**Files Involved:**
- All Phase 1-6 files
- `Home.jsx` — Full orchestrator integration
- `alphaEngine.js` — Full AI integration
- `learning.js` — Full learning engine integration

**Integration Points:**
1. Chat → AI → Portal → Result → AI → Chat (full loop)
2. Learning records update after each portal
3. Mistake patterns tracked across sessions
4. Spaced reviews triggered by schedule
5. Missions advance through steps
6. Notes saved from conversation
7. Voice TTS/STT working
8. File upload → multimodal analysis

**What Must Remain Unchanged:**
- Complete Alpha conversational experience
- All portal types and transitions
- Evidence-based decision making
- Deterministic mastery scoring
- Mission lifecycle

**Verification Tests:**
1. New user → greeting → first lesson → quiz → results → next action
2. Returning user → welcome back → due review
3. Mission creation → step completion → mission advancement
4. Mistake detection → mistake clinic → retest
5. Mastery progression → challenge → mastery check
6. Note saving → notes page → note deletion
7. Voice input → Alpha response → TTS playback
8. Image upload → Alpha analysis → response

---

### PHASE 8 — Production Verification

**Goal:** Production-ready deployment.

**Files Involved:**
- New: `Dockerfile` or deployment config
- New: `docker-compose.yml`
- `.env.production` — Production environment variables
- All source files — Final verification

**Checklist:**
- [ ] All tests pass
- [ ] Build succeeds (`npm run build`)
- [ ] No console errors in production
- [ ] Auth flows work end-to-end
- [ ] LLM calls work with production API keys
- [ ] File uploads work with production storage
- [ ] Database seeded with curriculum data
- [ ] All portals functional
- [ ] Spaced reviews trigger correctly
- [ ] Missions work end-to-end
- [ ] Voice features work in production browsers
- [ ] Performance acceptable (LLM response times)
- [ ] Error handling graceful
- [ ] Logging in place

**Deployment Options:**
1. **Vercel/Netlify** (frontend) + **Railway/Render** (backend)
2. **AWS** (EC2/ECS + RDS + S3)
3. **Docker** (self-hosted)
4. **Supabase** (if using Supabase stack)

---

## SUMMARY: What Preserves the Alpha Experience

The following MUST survive migration intact:

1. **Alpha's personality and decision-making** — The SYSTEM prompt in alphaEngine.js (~3,000 tokens)
2. **Evidence-based adaptation** — Every AI call receives student memory evidence
3. **Deterministic mastery** — mastery.js scoring formula
4. **Mistake pattern detection** — assessment.js inferPattern
5. **Spaced repetition** — spaced.js scheduler
6. **All 9 portal types** — lesson, quiz, exam, practice, diagnostic, review, challenge, mistake_clinic, mastery_check
7. **Mission system** — Time-aware adaptive planning
8. **Conversation persistence** — Full chat history with actions and reports
9. **Student memory** — Learning records, mistakes, concepts, notes
10. **The single conversational interface** — "Alpha is the app"

---

*This migration plan preserves the existing Alpha Study experience while transitioning from Base44 infrastructure to a standalone architecture. Every phase is designed to be independently verifiable before proceeding to the next.*
