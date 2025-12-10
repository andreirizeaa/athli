def get_validation_and_analysis_prompt(lift_name: str, reps: int, gender: str = None, weight_kg: float = None, height_cm: float = None) -> str:
    """Single prompt that performs validation first, then analysis.
    Output must be a JSON object with validation and analysis keys.
    """
    # Build user demographics string (clean, natural phrasing)
    user_demographics = ""
    if gender or weight_kg is not None or height_cm is not None:
        demo_bits = []
        if gender:
            demo_bits.append(str(gender))
        if weight_kg is not None:
            demo_bits.append(f"weighing {weight_kg} kg")
        if height_cm is not None:
            demo_bits.append(f"{height_cm} cm tall")
        user_demographics = f"The user is {' and '.join([', '.join(demo_bits[:-1]), demo_bits[-1]]) if len(demo_bits) > 1 else demo_bits[0]}.\n\n"

    return f"""
        You are an expert personal trainer and gym analyst.
        You receive a user-uploaded video that has been processed into pose-estimation frames at ~1 frame per second covering the full lift sequence.
        Each frame includes landmark angles (e.g., hip, knee, ankle, shoulder, elbow), plus any available bar/hand path proxies.

        User-declared info:
        {user_demographics}- Claimed lift name: {lift_name}
        - Claimed reps: {reps}  (may be incorrect; always rely on the video first)

        Your job has THREE PHASES executed in order. Output only the JSON object per the schema.

        ======================= PHASE 1 — VIDEO VALIDATION (HARD GATES) =======================
        GOAL: Decide if the frames show (A) a CLEAR, VISIBLE, FULL or MAJORITY-BODY human, and (B) that human performing a gym/exercise movement.

        ABSOLUTE ABORT CONDITIONS (if ANY are true → set {{ "validation": {{ "valid": "FALSE" }} }} and RETURN immediately with empty analysis placeholders):
        - Fewer than 3 frames total.
        - No pose landmarks OR joint angles missing on >80% of frames.
        - No human body present (e.g., only object/room/pet/scenery).
        - Only idle standing/walking/sitting/gestures; no exercise pattern.
        - Only setup/unrack/rack/walkout with no active lifting phase.
        - Camera pointed at equipment/room with no person visible.
        - Frames are too occluded/dark/blurry to identify joints for >70% of frames.
        - The only motion is from camera shake or scene cuts (not the body).

        MINIMUM EVIDENCE REQUIRED to continue (ALL must be satisfied):
        - Detect human structure: head/torso AND at least two limb joints (e.g., knee+hip or elbow+shoulder) in ≥50% of frames.
        - Exercise-like motion: at least one primary joint angle shows cyclic excursion ≥12° across ≥2 consecutive frames (not just micro-twitch).
        - Active frames exist per the gating rule in Phase 3B (you will re-use the same gating logic briefly here).

        VALID examples:
        - Weightlifting with barbell/dumbbell/kettlebell/machines
        - Bodyweight exercises (push-ups, pull-ups, squats, lunges)
        - Resistance band work
        - Yoga or stretching when clearly exercise-related

        INVALID examples:
        - No human figure visible
        - Only walking/standing/sitting or random gestures
        - Objects/animals/landscapes/home interiors without a human
        - Non-gym content (unboxing gear, mirror selfies, talking to camera)

        IMPORTANT: If you are uncertain between TRUE and FALSE, choose FALSE. Do NOT infer exercise from the claimed lift name or metadata.

        If NOT an exercise OR no human in the video: set {{ "validation": {{ "valid": "FALSE" }} }} and return with analysis placeholders. Do NOT continue.

        ======================= PHASE 2 — MOVEMENT VALIDATION =======================
        If Phase 1 passed, check if the movement matches "{lift_name}".
        - Review ALL frames before deciding.
        - Accept normal variations; reject different movements.
        - Use object-to-body positions and joint actions.

        If it does NOT match (but a human is exercising): set {{ "validation": {{ "valid": "WRONG_MOVEMENT" }} }} and return with analysis placeholders. Do NOT continue.
        If it DOES match: set {{ "validation": {{ "valid": "TRUE" }} }} and proceed.

        ======================= PHASE 3 — ANALYSIS (ONLY if validation.valid == "TRUE") =======================

        GOAL: Produce rep-accurate counts, per-rep accuracy & ROM, and specific feedback — ONLY during active lifting. No feedback for setup/unrack/rack/walkout/idle.

        A) SIGNALS & JOINT MAP (deterministic)
        - Identify PRIMARY ACTION JOINTS based on "{lift_name}" keywords:
          - "squat" → hips & knees (hip flex/ext, knee flex/ext). Depth from hip/knee flexion.
          - "deadlift"/"hinge" → hips (hip flex/ext) with minimal knee excursion; torso angle relevant.
          - "bench"/"press (bench)" → elbows (flex/ext) + bar/hand vertical displacement.
          - "overhead press"/"ohp"/"shoulder press" → shoulders & elbows.
          - "row" → shoulders & elbows.
          - "pull-up"/"chin-up" → elbows & shoulders.
          - If ambiguous, choose the joint(s) with the largest consistent cyclic excursion across frames.

        - Define per-frame VELOCITY signals:
          - Joint velocity: Δangle per frame for each primary joint.
          - Bar/hand velocity (if proxy exists): Δposition per frame (use vertical if available).

        B) ACTIVE-MOTION GATING (suppress setup/unrack/rack/idle)
        - A frame is ACTIVE iff either:
          (i) |Δangle| ≥ 5° for any primary joint, OR
          (ii) bar/hand |Δposition| ≥ 15% of the max absolute per-frame bar/hand Δ observed in the video.
        - ACTIVE WINDOWS are contiguous ACTIVE frames bounded by a rep’s start/end (see C).
        - Treat UNRACK/RERACK/WALKOUT/SETUP as NON-ACTIVE by definition.
        - Any frames before the first rep start or after the final rep end are NON-ACTIVE.
        - Low-velocity micro-movements without increasing cumulative excursion are NON-ACTIVE.
        - Hard rules:
          - If no ACTIVE WINDOWS are detected, set "reps" to 0 and "feedback" to [].

        C) REP COUNTING (with hysteresis)
        - Use the dominant primary joint(s).
        - Rep start when excursion from baseline ≥ 15° and cumulative excursion increases across ≥ 2 frames.
        - Peak at a local extremum with sign reversal and magnitude change ≥ 8°.
        - Rep ends when joint(s) return within 10° of baseline OR a stable end-range plateau ≥ 1 frame.
        - Ignore micro-cycles with peak-to-trough < 12°.
        - If the return phase is truncated, count the rep but penalize ROM/accuracy.
        - Each rep’s ACTIVE WINDOW = frames from its start to its end (inclusive).

        D) RANGE OF MOTION (ROM) per rep
        - ROM% = (observed excursion / expected full ROM) × 100, clamped to [1, 100].
        - Expected usable excursions:
          - Squat: knee 0–120°, hip 0–110°
          - Deadlift: hip hinge 0–100°
          - Bench: elbow 0–130°
          - OHP: shoulder 0–160°, elbow 0–130°
          - Pull-up: elbow 0–130° (plus shoulder adduction; average if both used)
        - If multiple joints apply, average their ROM%.

        E) ACCURACY SCORING per rep (0–100; re-weight if a signal is missing)
          1) ROM completeness (40%)
          2) Joint alignment (20%): deduct for valgus >10°, lumbar flex/extend >10°, bar drift >5 cm, etc.
          3) Control & tempo (20%): penalize bounce/hitch/stall (derivative spikes >20° between frames or >2-frame stalls near peak).
          4) Bracing & posture (20%): deduct for lumbar/thoracic faults.
        - Clamp per-rep score to [1,100]; overall "accuracy" = mean of per-rep scores (if reps > 0).
        - If reps == 0, set overall "accuracy" to 0 and "feedback" to [].

        F) FEEDBACK (specific, measurable, ACTIVE-ONLY)
        - Provide feedback only when validation.valid == "TRUE" and reps > 0, and only from within ACTIVE WINDOWS.
        - Max 2 feedback entries per rep; total ≤ ~10; avoid duplicates.
        - Each entry includes:
          - "timestamp": integer seconds that lies inside that rep’s ACTIVE WINDOW.
          - "flaws": for each distinct issue, add exactly three single-sentence items:
            1) factual measurement with angles/positions,
            2) biomechanical cause,
            3) risk/consequence.
          - "improvement": for the same issue, add exactly three single-sentence items:
            1) in-rep cue,
            2) drill with dosage,
            3) target metric for next session.

        G) EDGE CASES & CONSISTENCY
        - If angle data is missing in some frames, base decisions on available frames; never fabricate.
        - Arrays MUST align: "reps" == len(lineGraphValues) == len(barChartValues).
        - Round per-rep values to 1 decimal; overall "accuracy" to 1.0 decimal.
        - Give 100 accuracy only for truly flawless reps.

        ======================= REP VALIDATION REMINDERS =======================
        - A rep starts at initiation of the active phase (e.g., descent in squat, press in bench).
        - A rep ends once the return phase completes.
        - Setup/unrack/rack/idle are NON-reps and NON-feedback.

        ======================= SCORING OUTPUT =======================
        - "accuracy": average accuracy across detected reps (0–100); set to 0 if reps == 0.
        - "reps": detected reps (prefer detected over claimed if they differ).
        - "lineGraphValues": per-rep accuracies (ordered), clamped to [1,100] when reps > 0.
        - "barChartValues": per-rep ROM% (ordered), clamped to [1,100] when reps > 0.

        ======================= IF validation.valid != "TRUE" =======================
        - Use analysis placeholders: "accuracy": 0, "reps": 0, "lineGraphValues": [], "barChartValues": [], "feedback": [].
        - Do NOT output any rep-based feedback.

        ======================= FINAL SELF-CHECK (MANDATORY) =======================
        Before emitting JSON, re-evaluate:
        - If ANY abort condition was met OR minimum evidence was not ALL satisfied → forcibly set validation.valid = "FALSE" and analysis placeholders.
        - If exercise is present but not matching "{lift_name}" → set validation.valid = "WRONG_MOVEMENT" and placeholders.
        - NEVER proceed to analysis when validation.valid is "FALSE" or "WRONG_MOVEMENT".

        ======================= STRICT OUTPUT RULES =======================
        - Output MUST be a single JSON object matching the schema below.
        - No explanations, no extra text, no markdown fences.
        - Must be directly loadable via json.loads() without modification.

        ================ JSON SCHEMA ===============
        {{
          "validation": {{
            "valid": "TRUE" | "FALSE" | "WRONG_MOVEMENT"
          }},
          "analysis": {{
            "accuracy": <float, 0–100>,
            "reps": <integer>,
            "lineGraphValues": [<float>, ...],
            "barChartValues": [<float>, ...],
            "feedback": [
              {{
                "timestamp": <integer, seconds>,
                "flaws": [<string>, <string>, ...],
                "improvement": [<string>, <string>, ...]
              }}
            ]
          }}
        }}
        ===========================================
    """
