"""
Toxic Cybercafe Admin — FastAPI Backend
LLM: Ollama (local, no API key required)
State: in-memory only
"""
import asyncio
import json
import random
import time
from enum import Enum
from typing import Literal, Optional

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ─── App setup ──────────────────────────────────────────────────────────────
app = FastAPI(title="Toxic Cybercafe Admin", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Ollama config ───────────────────────────────────────────────────────────
OLLAMA_URL   = "http://localhost:11434/api/generate"
# Try llama3.2 first, fall back to llama3 or mistral
OLLAMA_MODEL = "llama3.2"

SYSTEM_PROMPT = (
    'Ты — движок игры "Toxic Cybercafe Admin". '
    "Компьютерный клуб в постсоветском городе. "
    "Клиенты — типичные геймеры: подростки, студенты, мужики за 30, которые орут в Dota. "
    "Язык клиентов: разговорный русский, много слэнга, иногда КАПСЛОК от злости. "
    "Ты возвращаешь ТОЛЬКО валидный JSON. Никакого текста вне JSON. Никакого markdown."
)

CLIENT_PERSONALITIES: dict[str, str] = {
    "Дима":     "агрессивный, всегда прав, угрожает жалобами и Роспотребнадзором",
    "Бауыржан": "спокойный, но упрямый, любит торговаться и напоминать что «платит деньги»",
    "Серёга":   "нытик, жалуется на всё подряд, использует много многоточий...",
    "Артём":    "подросток 14 лет, пишет на геймерском сленге, gg ez, много эмодзи",
    "Жека":     "35 лет, Dota-нарком, всё сравнивает с 2007 годом и клубом «Матрица»",
}

# ─── Fallbacks ───────────────────────────────────────────────────────────────
FALLBACK_INCIDENTS = [
    {"incident_type": "lag",           "message": "БЛИН ну чё за интернет?? 300 пинг в КС, я умираю каждый раунд!! ВЕРНИТЕ ДЕНЬГИ"},
    {"incident_type": "game_wont_start","message": "стим опять слетел. установить заново? у меня 40 минут осталось только..."},
    {"incident_type": "neighbor_smell", "message": "мужик за соседним компом... ты вообще мылся сегодня? я задыхаюсь буквально"},
    {"incident_type": "pc_noise",       "message": "кулер гудит как реактивный самолёт. невозможно играть, серьёзно"},
    {"incident_type": "hungry",         "message": "принеси доширак с кипятком. я плачу деньги, имею право"},
    {"incident_type": "mouse_broken",   "message": "мышка залипает! я уже третий раз умер из-за неё!!"},
    {"incident_type": "neighbor_loud",  "message": "скажи этому орущему за 3-м компом заткнуться! я не слышу игру"},
    {"incident_type": "time_low",       "message": "эй, у меня 8 минут осталось, закидывай ещё час давай"},
]
FALLBACK_REPLIES = [
    {"reply": "Ладно, разберёмся...",                              "loyalty_delta": -5,  "incident_resolved": True},
    {"reply": "ВОТ ТАК СЕРВИС. всем расскажу какой тут персонал!", "loyalty_delta": -20, "incident_resolved": True},
    {"reply": "ну хоть отвечаешь. жду.",                          "loyalty_delta":  3,  "incident_resolved": False},
]

# ─── Pydantic models ─────────────────────────────────────────────────────────
class PCStatus(str, Enum):
    IDLE      = "idle"
    OCCUPIED  = "occupied"
    REBOOTING = "rebooting"
    BANNED    = "banned"


class PC(BaseModel):
    id:               int
    status:           PCStatus = PCStatus.IDLE
    client_name:      str = ""
    minutes_left:     int = 0
    current_incident: Optional[str]  = None
    incident_type:    Optional[str]  = None
    incident_ticks:   int = 0


class ChatMessage(BaseModel):
    id:        int
    pc_id:     int
    sender:    Literal["client", "admin", "system"]
    text:      str
    timestamp: float


class GameState(BaseModel):
    loyalty:     int = 100
    pcs:         list[PC]
    messages:    list[ChatMessage]
    tick:        int = 0
    game_over:   bool = False
    score:       int = 0
    msg_counter: int = 0


class PlayerAction(BaseModel):
    pc_id:       int
    action_type: Literal["text", "add_time", "reboot", "ban"]
    text:        Optional[str] = None


class ActionResponse(BaseModel):
    ok:          bool
    llm_reply:   Optional[str] = None
    loyalty_delta: Optional[int] = None
    new_loyalty: int


# ─── State init ──────────────────────────────────────────────────────────────
def init_game_state() -> GameState:
    client_names = ["Дима", "Бауыржан", "Серёга", "Артём", "Жека"]
    pcs = [
        PC(
            id=i,
            status=PCStatus.OCCUPIED,
            client_name=client_names[i - 1],
            minutes_left=random.randint(20, 90),
        )
        for i in range(1, 6)
    ]
    return GameState(pcs=pcs, messages=[])


GAME_STATE: GameState = init_game_state()


# ─── Helpers ─────────────────────────────────────────────────────────────────
def add_message(state: GameState, pc_id: int, sender: str, text: str) -> None:
    state.msg_counter += 1
    state.messages.append(ChatMessage(
        id=state.msg_counter,
        pc_id=pc_id,
        sender=sender,  # type: ignore[arg-type]
        text=text,
        timestamp=time.time(),
    ))
    # Keep last 120 messages
    if len(state.messages) > 120:
        state.messages = state.messages[-120:]


async def call_llm(prompt: str) -> dict:
    """Call Ollama with format=json for guaranteed JSON output."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(OLLAMA_URL, json={
            "model":  OLLAMA_MODEL,
            "prompt": SYSTEM_PROMPT + "\n\n" + prompt,
            "stream": False,
            "format": "json",
        })
        resp.raise_for_status()
        data = resp.json()
        return json.loads(data["response"])


async def call_llm_safe(prompt: str, fallback_list: list) -> dict:
    try:
        return await call_llm(prompt)
    except Exception as e:
        print(f"[LLM] Error: {e} — using fallback")
        return random.choice(fallback_list)


# ─── Incident generation (async, non-blocking) ───────────────────────────────
async def generate_incident(pc: PC) -> None:
    global GAME_STATE
    personality = CLIENT_PERSONALITIES.get(pc.client_name, "обычный клиент")

    prompt = f"""Сгенерируй случайный инцидент для ПК №{pc.id}.
Клиента зовут {pc.client_name}. Его характер: {personality}.
У него осталось {pc.minutes_left} минут оплаченного времени.

Выбери ОДИН тип инцидента из списка:
- "time_low"        — заканчивается время (только если minutes_left < 15)
- "lag"             — лагает интернет / игра фризит
- "neighbor_smell"  — воняет сосед
- "game_wont_start" — не запускается игра / краш
- "pc_noise"        — шумит кулер / зависает ПК
- "neighbor_loud"   — сосед орёт в микрофон
- "hungry"          — клиент требует еды (токсично)
- "mouse_broken"    — сломалась мышка

Few-shot примеры хороших инцидентов:
{{"incident_type": "lag", "message": "БЛИН ну чё за интернет вообще?? 300 пинг в КС, я умираю каждый раунд из-за вас!! ВЕРНИТЕ ДЕНЬГИ"}}
{{"incident_type": "neighbor_smell", "message": "мужик за 4-м компом... ты вообще мылся сегодня? я задыхаюсь буквально"}}
{{"incident_type": "game_wont_start", "message": "стим опять слетел. установить заново? у меня 40 минут осталось только"}}
{{"incident_type": "hungry", "message": "принеси доширак с кипятком. я плачу деньги, имею право"}}
{{"incident_type": "time_low", "message": "эй, у меня 8 минут осталось, закидывай ещё час давай"}}

Ответь JSON:
{{"incident_type": "<тип>", "message": "<сообщение клиента, 1-3 предложения, разговорный стиль, учти характер>"}}"""

    result = await call_llm_safe(prompt, FALLBACK_INCIDENTS)

    # Apply to state (check pc still exists and has no incident)
    for p in GAME_STATE.pcs:
        if p.id == pc.id and p.status == PCStatus.OCCUPIED and p.current_incident is None:
            p.current_incident = result.get("message", "Что-то не так!")
            p.incident_type    = result.get("incident_type", "lag")
            p.incident_ticks   = 0
            add_message(GAME_STATE, pc.id, "client", p.current_incident)
            break


# ─── Reboot task ─────────────────────────────────────────────────────────────
async def reboot_pc_task(pc: PC) -> None:
    await asyncio.sleep(6)  # ~2 polling ticks
    if pc.status == PCStatus.REBOOTING:
        pc.status = PCStatus.OCCUPIED
        add_message(GAME_STATE, pc.id, "system", f"✅ ПК №{pc.id} перезагружен и готов к работе")


# ─── Game tick ───────────────────────────────────────────────────────────────
def _tick(state: GameState) -> None:
    state.tick += 1

    for pc in state.pcs:
        if pc.status != PCStatus.OCCUPIED:
            continue

        # Decrease time
        pc.minutes_left = max(0, pc.minutes_left - 1)

        # Client leaves if time runs out
        if pc.minutes_left <= 0:
            add_message(state, pc.id, "system",
                        f"⏰ Время вышло. {pc.client_name} покидает клуб.")
            state.loyalty = max(0, state.loyalty - 10)
            pc.status           = PCStatus.IDLE
            pc.client_name      = ""
            pc.current_incident = None
            pc.incident_type    = None
            pc.incident_ticks   = 0
            continue

        # Pending incident timeout penalty
        if pc.current_incident is not None:
            pc.incident_ticks += 1
            if pc.incident_ticks == 3:
                add_message(state, pc.id, "system",
                            f"⚠️ {pc.client_name} ждёт ответа уже долго...")
            if pc.incident_ticks > 2:
                state.loyalty = max(0, state.loyalty - 5)

    # Check game over
    if state.loyalty <= 0:
        state.game_over = True
        return

    # 30% chance: generate incident on a random OCCUPIED PC without one
    occupied_no_incident = [
        p for p in state.pcs
        if p.status == PCStatus.OCCUPIED and p.current_incident is None
    ]
    if occupied_no_incident and random.random() < 0.30:
        target = random.choice(occupied_no_incident)
        asyncio.create_task(generate_incident(target))


# ─── Endpoints ───────────────────────────────────────────────────────────────
@app.get("/state", response_model=GameState)
async def get_state():
    global GAME_STATE
    if not GAME_STATE.game_over:
        _tick(GAME_STATE)
    return GAME_STATE


@app.post("/action", response_model=ActionResponse)
async def post_action(action: PlayerAction):
    global GAME_STATE

    pc = next((p for p in GAME_STATE.pcs if p.id == action.pc_id), None)
    if not pc:
        return ActionResponse(ok=False, new_loyalty=GAME_STATE.loyalty)

    # ── add_time ──────────────────────────────────────────────────
    if action.action_type == "add_time":
        pc.minutes_left    += 60
        pc.current_incident = None
        pc.incident_type    = None
        pc.incident_ticks   = 0
        GAME_STATE.loyalty  = min(100, GAME_STATE.loyalty + 5)
        add_message(GAME_STATE, pc.id, "system", f"⏱ +1 час добавлен для {pc.client_name}")
        add_message(GAME_STATE, pc.id, "client",
                    random.choice(["о, норм! спасибо))", "ладно, ещё поиграю", "ок ок, зачёт"]))
        return ActionResponse(ok=True, loyalty_delta=5, new_loyalty=GAME_STATE.loyalty)

    # ── reboot ────────────────────────────────────────────────────
    if action.action_type == "reboot":
        old_name            = pc.client_name
        pc.status           = PCStatus.REBOOTING
        pc.current_incident = None
        pc.incident_type    = None
        pc.incident_ticks   = 0
        GAME_STATE.loyalty  = max(0, GAME_STATE.loyalty - 3)
        add_message(GAME_STATE, pc.id, "system", f"🔄 ПК №{pc.id} перезагружается...")
        add_message(GAME_STATE, pc.id, "client",
                    random.choice(["ну и ладно...", "ладно, жду", "блин... ну ок"]))
        asyncio.create_task(reboot_pc_task(pc))
        return ActionResponse(ok=True, loyalty_delta=-3, new_loyalty=GAME_STATE.loyalty)

    # ── ban ───────────────────────────────────────────────────────
    if action.action_type == "ban":
        kicked_name         = pc.client_name
        pc.status           = PCStatus.BANNED
        pc.current_incident = None
        pc.incident_type    = None
        pc.incident_ticks   = 0
        GAME_STATE.loyalty  = max(0, GAME_STATE.loyalty - 15)
        add_message(GAME_STATE, pc.id, "system", f"🚫 {kicked_name} кикнут с ПК №{pc.id}")
        if GAME_STATE.loyalty <= 0:
            GAME_STATE.game_over = True
        return ActionResponse(ok=True, loyalty_delta=-15, new_loyalty=GAME_STATE.loyalty)

    # ── text ──────────────────────────────────────────────────────
    if action.action_type == "text" and action.text:
        add_message(GAME_STATE, pc.id, "admin", action.text)

        personality = CLIENT_PERSONALITIES.get(pc.client_name, "обычный клиент")
        prompt = f"""ПК №{pc.id}. Клиент: {pc.client_name} (характер: {personality}).
Инцидент: {pc.incident_type or "общее обращение"} — "{pc.current_incident or "—"}"
Ответ администратора: "{action.text}"

Оцени ответ администратора по шкале лояльности:
- Адекватный и полезный       → loyalty_delta от +5 до +15
- Нейтральный или расплывчатый → loyalty_delta от -5 до +5
- Грубый, токсичный, бесполезный → loyalty_delta от -20 до -5
- Оскорбительный / совсем не по теме → loyalty_delta от -30 до -20

Напиши реакцию клиента (1-3 предложения) в его стиле. Учти характер персонажа.

Few-shot примеры:
Ответ "ну и иди нахер" → {{"reply": "ВОТ ТАК СЕРВИС. всем расскажу, ухожу.", "loyalty_delta": -25, "incident_resolved": true}}
Ответ "перезагрузим стим" → {{"reply": "окей, жду. только быстро плиз", "loyalty_delta": 8, "incident_resolved": false}}
Ответ "извини, сейчас разберёмся" → {{"reply": "ну хоть отвечаешь, уже норм. жду", "loyalty_delta": 5, "incident_resolved": false}}

Ответь JSON:
{{"reply": "<реакция клиента>", "loyalty_delta": <от -30 до +15>, "incident_resolved": <true/false>}}"""

        result    = await call_llm_safe(prompt, FALLBACK_REPLIES)
        reply     = result.get("reply", "...")
        delta     = max(-30, min(15, int(result.get("loyalty_delta", -5))))
        resolved  = bool(result.get("incident_resolved", False))

        GAME_STATE.loyalty = max(0, min(100, GAME_STATE.loyalty + delta))
        if resolved:
            pc.current_incident = None
            pc.incident_type    = None
            pc.incident_ticks   = 0

        add_message(GAME_STATE, pc.id, "client", reply)

        if GAME_STATE.loyalty <= 0:
            GAME_STATE.game_over = True

        return ActionResponse(
            ok=True,
            llm_reply=reply,
            loyalty_delta=delta,
            new_loyalty=GAME_STATE.loyalty,
        )

    return ActionResponse(ok=False, new_loyalty=GAME_STATE.loyalty)


@app.post("/restart")
async def restart():
    global GAME_STATE
    GAME_STATE = init_game_state()
    return {"ok": True}


# ─── Dev entry ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
