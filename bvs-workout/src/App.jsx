import { useState, useEffect, useCallback, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { checkUser, loadData, saveData } from "./supabase";

// ─── Exercise Guides with Muscle Activation Tips ───
const EXERCISE_GUIDES = {
  "bb-bench": { setup: "Lie flat on bench, feet planted. Grip bar slightly wider than shoulder width. Unrack with arms locked.", form: "Lower bar to mid-chest with elbows at ~45°. Press up in a slight arc. Keep shoulder blades retracted.", mistakes: "Bouncing off chest. Flaring elbows 90°. Hips off bench. Not locking out.", yt: "barbell bench press Jeff Nippard",
    muscles: [
      { name: "Chest (Pectoralis Major)", type: "primary", tip: "Squeeze your chest together at the top like you're trying to crush a can between your pecs. Focus on driving with your chest, not your arms." },
      { name: "Triceps", type: "secondary", tip: "Lock out fully at the top to maximize tricep engagement. Keep elbows tucked at 45° to balance chest and tricep involvement." },
      { name: "Front Delts", type: "secondary", tip: "Keep shoulder blades retracted and pinched together throughout to reduce excessive front delt takeover." }
    ] },
  "bb-deadlift": { setup: "Feet hip-width, bar over mid-foot. Grip outside knees. Flat back, chest up.", form: "Drive through floor. Bar drags shins/thighs. Lock hips and knees together at top.", mistakes: "Rounding back. Bar drifting. Jerking off floor. Hyperextending.", yt: "conventional deadlift form tutorial",
    muscles: [
      { name: "Hamstrings & Glutes", type: "primary", tip: "Initiate the lift by pushing the floor away with your legs. Squeeze glutes hard at lockout — think about thrusting your hips into the bar." },
      { name: "Back (Erectors & Lats)", type: "primary", tip: "Keep lats engaged by imagining you're bending the bar around your shins. Maintain a neutral spine — your back is a stabilizer, not the prime mover." },
      { name: "Traps & Grip", type: "secondary", tip: "Let your traps engage naturally at lockout. Don't shrug at the top. Use mixed grip or straps if grip fails before legs do." }
    ] },
  "lat-pulldown-wide": { setup: "Thighs locked under pad. Wide overhand grip. Lean back slightly.", form: "Pull to upper chest, elbows down and back. Squeeze lats. Full stretch at top.", mistakes: "Pulling behind neck. Momentum. Not extending. Gripping too tight.", yt: "lat pulldown proper form",
    muscles: [
      { name: "Lats (Latissimus Dorsi)", type: "primary", tip: "Think about driving your elbows into your back pockets. Initiate the pull with your lats, not your biceps — imagine your hands are just hooks." },
      { name: "Biceps", type: "secondary", tip: "Use a thumbless grip to reduce bicep dominance and force your back to do the work." },
      { name: "Rear Delts & Rhomboids", type: "secondary", tip: "Squeeze shoulder blades together at the bottom of each rep for 1 second to activate the mid-back." }
    ] },
  "seated-db-press": { setup: "Bench 75-80°. Back pressed firm. Kick dumbbells to shoulders.", form: "Press up slightly inward. Lower to ear level. Core braced throughout.", mistakes: "Excessive arch. Pressing out not up. Elbows too far back.", yt: "seated dumbbell shoulder press form",
    muscles: [
      { name: "Front & Side Delts", type: "primary", tip: "Keep elbows slightly in front of your body to maximize front delt activation. Press up and slightly inward." },
      { name: "Triceps", type: "secondary", tip: "Full lockout at the top maximizes tricep engagement. Control the negative for 2-3 seconds." },
      { name: "Upper Chest", type: "secondary", tip: "The slight incline means your upper chest assists. Keep core tight to prevent lower back from compensating." }
    ] },
  "leg-press": { setup: "Back flat on pad. Feet shoulder-width on mid-platform.", form: "Lower to ~90° knee bend. Press through heels. Don't lock knees.", mistakes: "Hips curling off pad. Feet wrong position. Locking knees.", yt: "leg press proper form",
    muscles: [
      { name: "Quads", type: "primary", tip: "Place feet lower on the platform and closer together to bias quads. Push through the balls of your feet." },
      { name: "Glutes", type: "primary", tip: "Place feet higher and wider to shift emphasis to glutes. Push through your heels and go deeper." },
      { name: "Hamstrings", type: "secondary", tip: "A wider stance with toes pointed out will bring hamstrings more into the movement." }
    ] },
  "cable-lat-raise": { setup: "Cable lowest. Stand sideways. Far hand grabs handle, lean away.", form: "Raise to parallel, slight elbow bend. Lead with elbow. Lower slowly.", mistakes: "Shrugging. Swinging. Above shoulder. Rotating wrist.", yt: "cable lateral raise form",
    muscles: [
      { name: "Side Delts (Lateral Head)", type: "primary", tip: "Lead with your elbow, not your hand. Think about pouring water out of a pitcher at the top. Stop at shoulder height." },
      { name: "Traps (Upper)", type: "secondary", tip: "Actively depress your shoulder before each rep to prevent trap takeover." }
    ] },
  "bb-curl": { setup: "Feet shoulder-width. Shoulder-width underhand grip. Arms extended.", form: "Curl flexing elbows only. Squeeze at top. Full extension. Elbows pinned.", mistakes: "Swinging. Elbows forward. Not full extension. Wrist curling.", yt: "barbell curl proper form",
    muscles: [
      { name: "Biceps (Long & Short Head)", type: "primary", tip: "Keep elbows pinned to your sides. Supinate at the top for peak contraction. Go all the way down." },
      { name: "Forearms (Brachioradialis)", type: "secondary", tip: "Maintain a firm wrist — don't let it curl backward. Wider grip works forearms harder." }
    ] },
  "tri-pushdown": { setup: "Cable high. Overhand grip. Slight lean. Elbows pinned to sides.", form: "Extend fully down. Split rope at bottom. Return to parallel slowly.", mistakes: "Elbows flaring. Using shoulders. Leaning too far. Not locking.", yt: "tricep pushdown proper form",
    muscles: [
      { name: "Triceps (All Three Heads)", type: "primary", tip: "Lock out completely at the bottom and squeeze for 1 second. Keep upper arms glued to your sides." },
      { name: "Core (Stabilizer)", type: "secondary", tip: "Brace your core and resist the urge to lean into the push." }
    ] },
  "incline-db": { setup: "Bench 30-45°. Dumbbells at shoulders, palms forward. Feet flat.", form: "Press up slightly inward. Lower to upper chest at ~45° elbows.", mistakes: "Bench too steep. Dumbbells drifting. Bouncing. No scapular retraction.", yt: "incline dumbbell press form",
    muscles: [
      { name: "Upper Chest (Clavicular Head)", type: "primary", tip: "Set bench to 30° for upper chest emphasis. Squeeze at the top and bring dumbbells slightly together." },
      { name: "Front Delts", type: "secondary", tip: "Retract shoulder blades hard to minimize delt takeover." },
      { name: "Triceps", type: "secondary", tip: "Full lockout engages triceps. A closer grip emphasizes triceps more." }
    ] },
  "hack-squat": { setup: "Shoulders under pads. Back flat. Feet shoulder-width forward.", form: "Lower to ~90°+. Press through whole foot. Knees track toes.", mistakes: "Heels lifting. Knees caving. Not deep enough. Aggressive lockout.", yt: "hack squat form tutorial",
    muscles: [
      { name: "Quads (All Four Heads)", type: "primary", tip: "Place feet lower and narrower to maximize quad stretch. Go deep — below parallel if possible." },
      { name: "Glutes", type: "secondary", tip: "Wider stance and deeper range increases glute activation. Squeeze at the top." }
    ] },
  "chest-row": { setup: "Incline bench 30-45°. Face down, chest on pad. Dumbbells hanging.", form: "Row driving elbows back. Squeeze shoulder blades. Lower to stretch.", mistakes: "Chest off pad. No squeeze. Momentum. Partial reps.", yt: "chest supported row form",
    muscles: [
      { name: "Mid Back (Rhomboids & Mid Traps)", type: "primary", tip: "Squeeze shoulder blades together at the top. Hold 1-2 seconds. Pull elbows to your hips." },
      { name: "Lats", type: "primary", tip: "Wider grip and pulling to chest targets more lats. Narrower grip to waist targets mid-back." },
      { name: "Biceps & Rear Delts", type: "secondary", tip: "Use a thumbless grip to reduce bicep involvement." }
    ] },
  "db-rdl": { setup: "Feet hip-width. Slight knee bend. Dumbbells in front, overhand.", form: "Hinge hips back. Lower along legs to hamstring stretch. Drive hips forward.", mistakes: "Rounding back. Bending knees too much. Not hinging enough.", yt: "dumbbell romanian deadlift form",
    muscles: [
      { name: "Hamstrings", type: "primary", tip: "Push your hips straight back like closing a car door with your butt. Feel a deep stretch at the bottom." },
      { name: "Glutes", type: "primary", tip: "Squeeze glutes hard at the top to full hip extension. Don't hyperextend your back." },
      { name: "Lower Back (Erectors)", type: "secondary", tip: "Keep back flat throughout. If your lower back is sore, you're likely rounding." }
    ] },
  "machine-shoulder": { setup: "Seat adjusted, handles at shoulder height. Back flat on pad.", form: "Press overhead nearly extended. Lower to ear level. Core braced.", mistakes: "Arching off pad. Partial ROM. Uneven pressing.", yt: "machine shoulder press form",
    muscles: [
      { name: "Shoulders (All Three Heads)", type: "primary", tip: "Press straight up, not forward. Full range of motion — all the way down to ear level." },
      { name: "Triceps", type: "secondary", tip: "Full lockout at the top activates the triceps." }
    ] },
  "face-pull": { setup: "Cable at face height. Rope attachment. Thumbs toward you.", form: "Pull to face, split rope apart. Externally rotate. Squeeze rear delts.", mistakes: "Pulling to chest. No rotation. Too heavy. Leaning back.", yt: "face pulls proper form",
    muscles: [
      { name: "Rear Delts", type: "primary", tip: "Pull to your forehead, not your chest. Fists beside your ears with elbows high. Squeeze 2 seconds." },
      { name: "Rotator Cuff & Mid Traps", type: "secondary", tip: "Focus on external rotation — this is what makes face pulls valuable for shoulder health." }
    ] },
  "hammer-curl": { setup: "Feet shoulder-width. Dumbbells at sides, neutral grip.", form: "Curl keeping palms facing each other. Squeeze. Full extension.", mistakes: "Swinging. Rotating wrists. Elbows forward. Momentum.", yt: "hammer curl proper form",
    muscles: [
      { name: "Brachialis & Brachioradialis", type: "primary", tip: "The neutral grip shifts work to the brachialis which pushes your bicep peak up. Keep palms facing each other." },
      { name: "Biceps (Long Head)", type: "secondary", tip: "Keep elbows slightly behind your torso for more long head emphasis." }
    ] },
  "oh-db-ext": { setup: "Hold one dumbbell both hands, cupping top. Press overhead.", form: "Lower behind head bending elbows. Upper arms by ears. Extend squeezing.", mistakes: "Elbows flaring. Not deep enough. Arching back.", yt: "overhead tricep extension form",
    muscles: [
      { name: "Triceps (Long Head)", type: "primary", tip: "Overhead position stretches the long head — the biggest part of your tricep. Go as deep as possible behind your head." },
      { name: "Triceps (Medial & Lateral)", type: "secondary", tip: "Full lockout hits all three heads. Squeeze hard at extension." }
    ] },
  "db-flat": { setup: "Lie flat. Kick dumbbells up. Arms extended, slight back arch.", form: "Lower to chest, elbows ~45°. Press up inward. Scapula retracted.", mistakes: "Too heavy. No retraction. Drifting outward. Partial ROM.", yt: "dumbbell flat bench press form",
    muscles: [
      { name: "Chest (Pectoralis Major)", type: "primary", tip: "Dumbbells allow deeper stretch than barbell. Go deep at bottom and squeeze inward at top. Think hugging a tree." },
      { name: "Triceps & Front Delts", type: "secondary", tip: "Pin shoulder blades back and down to keep chest dominant." }
    ] },
  "bb-row": { setup: "Feet shoulder-width. Hinge ~45°. Grip just outside knees.", form: "Row to lower chest. Drive elbows back. Squeeze. Full extension.", mistakes: "Too upright. Momentum. Rounding back.", yt: "barbell row form",
    muscles: [
      { name: "Lats & Mid Back", type: "primary", tip: "Pull to lower chest for lat focus, to sternum for more mid-back. Drive elbows behind your body." },
      { name: "Biceps & Rear Delts", type: "secondary", tip: "Use straps to reduce bicep involvement. Wider grip shifts more to rear delts." }
    ] },
  "bss": { setup: "~2ft from bench. Rear foot on bench laces down. Dumbbells at sides.", form: "Lower until back knee near floor. Front shin vertical. Drive through front heel.", mistakes: "Too close. Knee caving. Leaning forward.", yt: "bulgarian split squat form",
    muscles: [
      { name: "Quads & Glutes", type: "primary", tip: "Stay upright with shorter stance for quads. Lean forward with longer stance for glutes. Push through heel for glutes, ball of foot for quads." },
      { name: "Hamstrings & Core", type: "secondary", tip: "The deeper you go, the more hamstring stretch. Core works overtime for balance." }
    ] },
  "cg-lat-pull": { setup: "Close-grip V-bar. Arms fully extended overhead.", form: "Pull to upper chest. Elbows down, slight back lean. Full extension.", mistakes: "Pulling with arms. Too much lean. Rushing.", yt: "close grip lat pulldown form",
    muscles: [
      { name: "Lats (Lower Fibers)", type: "primary", tip: "Close grip emphasizes lower lats. Drive elbows down and back into your hips." },
      { name: "Biceps", type: "secondary", tip: "Close grip involves biceps more. Use thumbless grip to shift emphasis back to lats." }
    ] },
  "arnold-press": { setup: "Seated. Dumbbells front of shoulders, palms facing you.", form: "Press while rotating palms outward. At top palms forward. Reverse down.", mistakes: "No full rotation. Rushing. Arching back.", yt: "arnold press proper form",
    muscles: [
      { name: "All Three Delt Heads", type: "primary", tip: "The rotation hits front, side, and rear delts in one movement. Control the rotation." },
      { name: "Triceps", type: "secondary", tip: "Full lockout at the top. The rotation makes this more shoulder-dominant than standard press." }
    ] },
  "cable-lat-raise-c": { setup: "Cable lowest. Sideways. Far hand, lean away.", form: "Raise to parallel, elbow bend. Lead with elbow. Slow lower.", mistakes: "Shrugging. Swinging. Above parallel.", yt: "cable lateral raise form",
    muscles: [
      { name: "Side Delts", type: "primary", tip: "Cable provides constant tension. Lead with your elbow, not your hand." },
      { name: "Traps", type: "secondary", tip: "Depress your shoulder before each rep. If your trap is burning, reset." }
    ] },
  "incline-curl": { setup: "Bench 45° incline. Arms hanging, underhand grip.", form: "Curl keeping upper arms behind torso. Squeeze. Full stretch.", mistakes: "Arms swinging forward. Not extending. Momentum.", yt: "incline dumbbell curl form",
    muscles: [
      { name: "Biceps (Long Head)", type: "primary", tip: "The incline stretches the long head more than any other curl. Let arms hang behind you. Full stretch at bottom." },
      { name: "Forearms", type: "secondary", tip: "Supinate hard at the top for maximum peak contraction." }
    ] },
  "skull-crush": { setup: "Lie flat. EZ bar narrow overhand. Arms above forehead.", form: "Lower to forehead bending elbows. Upper arms angled back. Extend up.", mistakes: "Elbows flaring. Lowering to nose. Too heavy.", yt: "skull crushers proper form",
    muscles: [
      { name: "Triceps (All Three Heads)", type: "primary", tip: "Angle upper arms slightly back toward your head. This keeps tension on triceps throughout." },
      { name: "Chest & Shoulders (Stabilizers)", type: "secondary", tip: "Keep elbows shoulder-width. If they flare, weight is too heavy." }
    ] },
  "machine-chest": { setup: "Seat adjusted, handles at mid-chest. Back flat.", form: "Press forward nearly extended. Squeeze chest. Controlled return.", mistakes: "Wrong height. Partial reps. Slamming weights.", yt: "machine chest press form",
    muscles: [
      { name: "Chest", type: "primary", tip: "Focus on squeezing pecs together at end of each rep. Great for mind-muscle connection." },
      { name: "Triceps & Front Delts", type: "secondary", tip: "Machines are great for training to failure safely. Go to true failure on last set." }
    ] },
  "seated-cable-row": { setup: "Feet on platform, slight knee bend. Wide handle overhand.", form: "Pull to lower chest. Squeeze blades. Slight lean back. Full extension.", mistakes: "Excessive rocking. Rounding. No squeeze.", yt: "seated cable row wide grip form",
    muscles: [
      { name: "Mid Back, Lats & Rhomboids", type: "primary", tip: "Pull to lower chest and squeeze shoulder blades 1-2 seconds. Slight body rock (10-15°) is fine." },
      { name: "Biceps & Rear Delts", type: "secondary", tip: "Wide grip targets more rear delts. Close grip targets more lats." }
    ] },
  "leg-ext-curl": { setup: "Ext: back on pad, knees at edge. Curl: face down, pad at ankles.", form: "Ext: extend fully, squeeze quads. Curl: curl to glutes, squeeze hams.", mistakes: "Swinging. Partial ROM. Rushing.", yt: "leg extension leg curl form",
    muscles: [
      { name: "Quads (Extension)", type: "primary", tip: "Squeeze and hold at top 1-2 seconds. Point toes outward for VMO. Full extension every rep." },
      { name: "Hamstrings (Curl)", type: "primary", tip: "Curl all the way to glutes and squeeze hard. Point toes to reduce calf involvement. 3-second negatives." }
    ] },
  "walking-lunge": { setup: "Stand tall, dumbbells at sides. Clear path.", form: "Step into lunge, both knees ~90°. Push off front foot, step through.", mistakes: "Short step. Knee past toes. Leaning. Back knee too high.", yt: "walking lunges form",
    muscles: [
      { name: "Quads & Glutes", type: "primary", tip: "Longer steps = more glutes, shorter = more quads. Push through heel for glutes, ball of foot for quads." },
      { name: "Hamstrings & Core", type: "secondary", tip: "Core stabilizes every step. Keep torso upright and brace hard." }
    ] },
  "rear-delt-fly": { setup: "Seat adjusted, handles at shoulders. Chest against pad.", form: "Open arms in arc. Squeeze rear delts/upper back. Slow return.", mistakes: "Too heavy. No squeeze. Partial ROM. Shrugging.", yt: "rear delt fly machine form",
    muscles: [
      { name: "Rear Delts", type: "primary", tip: "Lead with elbows, not hands. Squeeze at back 2 seconds. Use weight allowing 12-15 clean reps." },
      { name: "Mid Traps & Rhomboids", type: "secondary", tip: "Pulling past parallel engages more mid-back." }
    ] },
  "lat-raise-machine": { setup: "Seat height so pads on outer forearms. Back against pad.", form: "Raise to shoulder height. Hold, squeeze side delts. Slow lower.", mistakes: "Shrugging. Above shoulders. Momentum.", yt: "lateral raise machine form",
    muscles: [
      { name: "Side Delts", type: "primary", tip: "Machine provides constant tension. Hold at top 1 second. Don't go above shoulder height." },
      { name: "Traps", type: "secondary", tip: "Keep shoulders pressed down throughout." }
    ] },
  "preacher-curl": { setup: "Armpits at pad top. EZ bar underhand. Arms on pad.", form: "Curl keeping arms on pad. Squeeze. Very slow lower to near-extension.", mistakes: "Elbows off pad. Not extending. Swinging.", yt: "preacher curl proper form",
    muscles: [
      { name: "Biceps (Short Head)", type: "primary", tip: "The pad prevents cheating. Go to near-full extension at bottom — this is where the magic happens. 3-second negatives." },
      { name: "Brachialis", type: "secondary", tip: "Brachialis sits under your bicep and pushes it up. Preacher curls are one of the best for it." }
    ] },
  "cable-oh-tri": { setup: "Cable low. Rope. Face away. Rope behind head, elbows forward.", form: "Extend forward/up straightening elbows. Squeeze. Slow return.", mistakes: "Elbows dropping. Arching. Not extending.", yt: "cable overhead tricep extension form",
    muscles: [
      { name: "Triceps (Long Head)", type: "primary", tip: "Overhead position maximally stretches the long head. Keep elbows close to ears and pointed forward." },
      { name: "Core (Stabilizer)", type: "secondary", tip: "Stagger stance for stability. If lower back hurts, weight is too heavy." }
    ] },
  "db-crunch": { setup: "Lie on bench or floor. Hold dumbbell on chest or behind head.", form: "Curl torso up squeezing abs. Lift shoulder blades off surface. Slow lower.", mistakes: "Pulling neck. Using momentum. Sitting all the way up (hip flexors). Not controlling negative.", yt: "weighted crunch dumbbell form",
    muscles: [
      { name: "Upper Abs (Rectus Abdominis)", type: "primary", tip: "Think about bringing your ribs toward your pelvis, not sitting up. Exhale forcefully at the top and squeeze for 1 second." },
      { name: "Obliques", type: "secondary", tip: "Add a slight twist at the top to engage obliques more." }
    ] },
  "russian-twist": { setup: "Sit on floor, knees bent. Hold medicine ball at chest. Lean back 45°.", form: "Rotate torso side to side, touching ball to floor each side. Feet can be elevated for harder.", mistakes: "Rotating just arms not torso. Too fast. Rounding back. Not engaging core.", yt: "medicine ball russian twist form",
    muscles: [
      { name: "Obliques", type: "primary", tip: "Rotate from your ribcage, not your arms. Your belly button should point in the direction you're twisting." },
      { name: "Rectus Abdominis", type: "secondary", tip: "Keep constant tension by maintaining the lean-back angle throughout." }
    ] },
  "reverse-crunch": { setup: "Lie on bench or floor. Hands grip bench behind head or flat on floor.", form: "Bring knees toward chest, then lift hips off surface. Lower slowly.", mistakes: "Using momentum to swing legs. Not lifting hips. Letting legs drop fast.", yt: "reverse crunch on bench form",
    muscles: [
      { name: "Lower Abs", type: "primary", tip: "Focus on curling your pelvis toward your ribcage at the top. The hip lift is where the magic happens — don't skip it." },
      { name: "Hip Flexors", type: "secondary", tip: "Keep the movement slow and controlled to minimize hip flexor involvement." }
    ] },
  "dead-bug": { setup: "Lie on back. Arms straight up, knees at 90° above hips.", form: "Extend opposite arm and leg simultaneously. Keep lower back pressed to floor. Alternate.", mistakes: "Back arching off floor. Moving too fast. Not coordinating breath.", yt: "dead bug exercise form tutorial",
    muscles: [
      { name: "Deep Core (Transverse Abdominis)", type: "primary", tip: "Press your lower back into the floor the entire time. If it arches, you've gone too far. This builds bulletproof core stability." },
      { name: "Rectus Abdominis", type: "secondary", tip: "Exhale as you extend. The anti-extension aspect trains abs in a functional way." }
    ] },
  "lying-leg-raise": { setup: "Lie on bench, hands gripping edges behind head. Legs extended.", form: "Raise legs to vertical. Lift hips slightly at top. Lower slowly without touching down.", mistakes: "Swinging legs. Arching back. Dropping legs fast. Bending knees too much.", yt: "lying leg raise bench form",
    muscles: [
      { name: "Lower Abs", type: "primary", tip: "The key is the hip curl at the top — once legs are vertical, push your feet toward the ceiling by lifting your hips. That's where the abs actually work." },
      { name: "Hip Flexors", type: "secondary", tip: "Slight knee bend is fine. Keep lower back pressed into bench throughout." }
    ] },
  "mb-woodchop": { setup: "Stand with feet shoulder-width. Hold medicine ball overhead to one side.", form: "Chop diagonally across body to opposite knee. Rotate through core. Return controlled.", mistakes: "Using arms only. Not rotating hips. Going too fast. Rounding back.", yt: "medicine ball woodchop exercise form",
    muscles: [
      { name: "Obliques", type: "primary", tip: "Drive the rotation from your core, not your arms. The medicine ball is just along for the ride. Feel the stretch in your obliques." },
      { name: "Rectus Abdominis & Serratus", type: "secondary", tip: "Exhale forcefully as you chop down. Control the return — the eccentric builds muscle." }
    ] },
  "bicycle-crunch": { setup: "Lie on back. Hands behind head (don't pull neck). Legs elevated.", form: "Bring opposite elbow to opposite knee while extending other leg. Alternate rhythmically.", mistakes: "Pulling neck forward. Too fast/jerky. Not fully extending leg. Elbows closing in.", yt: "bicycle crunch proper form",
    muscles: [
      { name: "Obliques & Rectus Abdominis", type: "primary", tip: "Focus on rotating your ribcage to meet your knee — your elbow follows naturally. Slow down. Each rep should take 2-3 seconds." },
      { name: "Hip Flexors", type: "secondary", tip: "Extend the straight leg fully to increase the challenge and range of motion." }
    ] },
  "plank-hold": { setup: "Forearms on floor, elbows under shoulders. Body in straight line.", form: "Hold position. Squeeze glutes, brace abs, breathe normally. Don't sag or pike.", mistakes: "Hips dropping. Butt too high. Holding breath. Looking up (strains neck).", yt: "plank exercise proper form technique",
    muscles: [
      { name: "Full Core (Transverse Abdominis)", type: "primary", tip: "Imagine someone is about to punch you in the stomach — that's how tight your core should be. Squeeze your glutes too." },
      { name: "Shoulders & Glutes", type: "secondary", tip: "Push the floor away with your forearms. Actively squeeze glutes to prevent hip sag." }
    ] },
  "db-side-bend": { setup: "Stand tall. Hold dumbbell in one hand at side. Other hand behind head.", form: "Lean to dumbbell side, stretching oblique. Pull back up using obliques. Do all reps one side then switch.", mistakes: "Using two dumbbells (counterbalances). Bending forward not sideways. Going too fast.", yt: "dumbbell side bend oblique form",
    muscles: [
      { name: "Obliques", type: "primary", tip: "Only hold ONE dumbbell. Go heavy. Focus on the stretch at the bottom and squeeze at the top. This is one of the few ways to really load obliques." },
      { name: "Core Stabilizers", type: "secondary", tip: "Keep your hips completely still — only your torso should move laterally." }
    ] },
  "mb-slam": { setup: "Stand with feet shoulder-width. Hold medicine ball overhead with both hands.", form: "Slam ball into floor with full force. Squat to pick up. Repeat explosively.", mistakes: "Not using full body. Bending at waist only. Not catching ball. Half-effort slams.", yt: "medicine ball slam exercise form",
    muscles: [
      { name: "Full Core & Rectus Abdominis", type: "primary", tip: "This is about power. Engage your entire core as you slam down — crunch your abs forcefully. Each slam should be maximal effort." },
      { name: "Shoulders & Lats", type: "secondary", tip: "Reach fully overhead before each slam to get full range. Use a dead-bounce ball if possible." }
    ] },
  "mountain-climber": { setup: "Start in push-up position. Hands under shoulders. Core tight.", form: "Drive knees to chest alternately in running motion. Keep hips level.", mistakes: "Butt piking up. Bouncing hips. Not bringing knees far enough. Hands too far forward.", yt: "mountain climbers proper form",
    muscles: [
      { name: "Core & Hip Flexors", type: "primary", tip: "Keep your hips at the same height as your shoulders — don't let them bounce. The slower you go, the more ab work; the faster, the more cardio." },
      { name: "Shoulders & Quads", type: "secondary", tip: "Drive each knee to your chest, not just to your waist. Press the floor away with your hands." }
    ] },
  "toe-touch": { setup: "Lie on back. Legs straight up vertically (or slight bend). Arms extended.", form: "Crunch up reaching hands toward toes. Lift shoulder blades fully off floor. Lower controlled.", mistakes: "Bouncing. Not lifting shoulders. Bending legs too much. Using neck.", yt: "toe touch crunch exercise form",
    muscles: [
      { name: "Upper Abs (Rectus Abdominis)", type: "primary", tip: "Reach for your toes but focus on curling your upper back off the floor. Exhale at the top and hold for 1 second." },
      { name: "Hip Flexors", type: "secondary", tip: "Keep legs as vertical as possible. A slight knee bend is fine if hamstrings are tight." }
    ] },
};

// YouTube search embed — auto-shows top result for each exercise
function getYTSearchEmbed(query) {
  return "https://www.youtube.com/embed?listType=search&list=" + encodeURIComponent(query);
}

const AB_WORKOUTS = {
  Ab1: { name: "Ab Day 1", subtitle: "Upper Abs", color: "#f97316", icon: "🟠",
    exercises: [
      { id: "db-crunch", name: "DB Weighted Crunches", sets: 3, reps: "10-15", muscle: "Upper Abs" },
      { id: "russian-twist", name: "MB Russian Twists", sets: 3, reps: "20 total", muscle: "Obliques" },
      { id: "reverse-crunch", name: "Reverse Crunches", sets: 3, reps: "12-15", muscle: "Lower Abs" },
      { id: "dead-bug", name: "Dead Bugs", sets: 3, reps: "10 each", muscle: "Core" },
    ] },
  Ab2: { name: "Ab Day 2", subtitle: "Lower Abs", color: "#f97316", icon: "🟠",
    exercises: [
      { id: "lying-leg-raise", name: "Lying Leg Raises", sets: 3, reps: "10-15", muscle: "Lower Abs" },
      { id: "mb-woodchop", name: "MB Woodchops", sets: 3, reps: "10 each", muscle: "Obliques" },
      { id: "bicycle-crunch", name: "Bicycle Crunches", sets: 3, reps: "20 total", muscle: "Abs/Obliques" },
      { id: "plank-hold", name: "Plank Hold", sets: 3, reps: "30-60s", muscle: "Full Core" },
    ] },
  Ab3: { name: "Ab Day 3", subtitle: "Obliques & Full Core", color: "#f97316", icon: "🟠",
    exercises: [
      { id: "db-side-bend", name: "DB Side Bends", sets: 3, reps: "12-15 each", muscle: "Obliques" },
      { id: "mb-slam", name: "Medicine Ball Slams", sets: 3, reps: "10-12", muscle: "Full Core" },
      { id: "mountain-climber", name: "Mountain Climbers", sets: 3, reps: "30s", muscle: "Core/Cardio" },
      { id: "toe-touch", name: "Toe Touches", sets: 3, reps: "12-15", muscle: "Upper Abs" },
    ] },
};
const AB_ORDER = ["Ab1", "Ab2", "Ab3"];

const WORKOUTS = {
  A: { name: "Workout A", subtitle: "Barbell Strength", color: "#3b82f6", icon: "🔵",
    exercises: [
      { id: "bb-bench", name: "Barbell Bench Press", sets: 3, reps: "8-12", muscle: "Chest" },
      { id: "bb-deadlift", name: "Barbell Deadlift", sets: 3, reps: "6-10", muscle: "Back/Hamstrings" },
      { id: "lat-pulldown-wide", name: "Lat Pulldown (Wide)", sets: 3, reps: "8-12", muscle: "Back" },
      { id: "seated-db-press", name: "Seated DB Shoulder Press", sets: 3, reps: "8-12", muscle: "Shoulders" },
      { id: "leg-press", name: "Leg Press", sets: 3, reps: "10-15", muscle: "Quads/Glutes" },
      { id: "cable-lat-raise", name: "Cable Lateral Raises", sets: 3, reps: "12-15", muscle: "Side Delts" },
      { id: "bb-curl", name: "Barbell Curl", sets: 3, reps: "10-12", muscle: "Biceps" },
      { id: "tri-pushdown", name: "Tricep Pushdown", sets: 3, reps: "10-12", muscle: "Triceps" },
    ] },
  B: { name: "Workout B", subtitle: "Incline & Hinge", color: "#22c55e", icon: "🟢",
    exercises: [
      { id: "incline-db", name: "Incline DB Press", sets: 3, reps: "8-12", muscle: "Upper Chest" },
      { id: "hack-squat", name: "Hack Squat", sets: 3, reps: "8-12", muscle: "Quads" },
      { id: "chest-row", name: "Chest Supported Row", sets: 3, reps: "8-12", muscle: "Back" },
      { id: "db-rdl", name: "DB Romanian Deadlift", sets: 3, reps: "10-12", muscle: "Hamstrings/Glutes" },
      { id: "machine-shoulder", name: "Machine Shoulder Press", sets: 3, reps: "8-12", muscle: "Shoulders" },
      { id: "face-pull", name: "Face Pulls", sets: 3, reps: "12-15", muscle: "Rear Delts" },
      { id: "hammer-curl", name: "Hammer Curls", sets: 3, reps: "10-12", muscle: "Biceps" },
      { id: "oh-db-ext", name: "OH DB Tricep Extension", sets: 3, reps: "10-15", muscle: "Triceps" },
    ] },
  C: { name: "Workout C", subtitle: "Unilateral & Volume", color: "#f59e0b", icon: "🟡",
    exercises: [
      { id: "db-flat", name: "DB Flat Press", sets: 3, reps: "8-12", muscle: "Chest" },
      { id: "bb-row", name: "Barbell Row", sets: 3, reps: "6-10", muscle: "Back" },
      { id: "bss", name: "Bulgarian Split Squats", sets: 3, reps: "10-12 each", muscle: "Quads/Glutes" },
      { id: "cg-lat-pull", name: "Close-Grip Lat Pulldown", sets: 3, reps: "8-12", muscle: "Back" },
      { id: "arnold-press", name: "Arnold Press", sets: 3, reps: "8-12", muscle: "Shoulders" },
      { id: "cable-lat-raise-c", name: "Cable Lateral Raises", sets: 3, reps: "12-15", muscle: "Side Delts" },
      { id: "incline-curl", name: "Incline DB Curls", sets: 3, reps: "10-12", muscle: "Biceps" },
      { id: "skull-crush", name: "Skull Crushers", sets: 3, reps: "10-12", muscle: "Triceps" },
    ] },
  D: { name: "Workout D", subtitle: "Machine & Isolation", color: "#a855f7", icon: "🟣",
    exercises: [
      { id: "machine-chest", name: "Machine Chest Press", sets: 3, reps: "8-12", muscle: "Chest" },
      { id: "seated-cable-row", name: "Seated Cable Row (Wide)", sets: 3, reps: "8-12", muscle: "Back" },
      { id: "leg-ext-curl", name: "Leg Ext + Leg Curl", sets: 3, reps: "10-15", muscle: "Quads/Hams", superset: true },
      { id: "walking-lunge", name: "Walking Lunges", sets: 3, reps: "12 each", muscle: "Legs" },
      { id: "rear-delt-fly", name: "Rear Delt Fly Machine", sets: 3, reps: "12-15", muscle: "Rear Delts" },
      { id: "lat-raise-machine", name: "Lateral Raise Machine", sets: 3, reps: "12-15", muscle: "Side Delts" },
      { id: "preacher-curl", name: "Preacher Curl", sets: 3, reps: "10-12", muscle: "Biceps" },
      { id: "cable-oh-tri", name: "Cable OH Tricep Ext", sets: 3, reps: "10-12", muscle: "Triceps" },
    ] },
};

const WORKOUT_ORDER = ["A", "B", "C", "D"];
const TODAY = () => new Date().toISOString().split("T")[0];
const muscleColors = { Chest: "#ef4444", "Upper Chest": "#ef4444", Back: "#3b82f6", "Back/Hamstrings": "#3b82f6", Shoulders: "#f59e0b", "Side Delts": "#f59e0b", "Rear Delts": "#f59e0b", Quads: "#22c55e", "Quads/Glutes": "#22c55e", Legs: "#22c55e", "Quads/Hams": "#22c55e", "Hamstrings/Glutes": "#a855f7", Biceps: "#ec4899", Triceps: "#06b6d4" };
const RPE_OPTIONS = [
  { value: "green", label: "3+ left", color: "#22c55e", bg: "rgba(34,197,94,0.15)", icon: "😊" },
  { value: "yellow", label: "1-3 left", color: "#f59e0b", bg: "rgba(245,158,11,0.15)", icon: "😤" },
  { value: "red", label: "Maxed", color: "#ef4444", bg: "rgba(239,68,68,0.15)", icon: "🫠" },
];

function sendNotif() {
  if ("Notification" in window && Notification.permission === "granted") try { new Notification("BVS Workout", { body: "Rest over. Time for your next set.", tag: "rest-timer", requireInteraction: true }); } catch {}
  try { const c = new (window.AudioContext || window.webkitAudioContext)(); [0,200,400].forEach(d => { const o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = 0.3; o.start(c.currentTime + d/1000); o.stop(c.currentTime + d/1000 + 0.15); }); } catch {}
}

// ─── Login Screen ───
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState(""), [pin, setPin] = useState(""), [error, setError] = useState(""), [checking, setChecking] = useState(false);
  const iS = { background: "#1e293b", border: "1px solid #334155", color: "#f8fafc", borderRadius: 10, padding: "14px 16px", fontSize: 18, width: "100%", outline: "none", boxSizing: "border-box", textAlign: "center" };
  const handleLogin = async () => {
    if (!username.trim() || pin.length < 4) { setError("Enter a username and 4-digit PIN"); return; }
    setChecking(true); setError("");
    const result = await checkUser(username, pin);
    if (result === "ok" || result === "new_user") { onLogin(username.toLowerCase().trim(), pin); }
    else { setError("Wrong PIN for this username"); setChecking(false); }
  };
  return (
    <div style={{ background: "#030712", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ padding: 32, width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: 48, fontWeight: 800, letterSpacing: -2 }}>BVS</div>
          <div style={{ color: "#64748b", fontSize: 16, marginTop: 4 }}>Workout</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>USERNAME</div>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Your name" autoCapitalize="none" autoCorrect="off" style={iS} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>4-DIGIT PIN</div>
          <input type="number" value={pin} onChange={e => setPin(e.target.value.slice(0, 4))} placeholder="••••" inputMode="numeric" maxLength={4} style={{ ...iS, letterSpacing: 12, fontSize: 24 }} />
        </div>
        {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 16, textAlign: "center" }}>{error}</div>}
        <button onClick={handleLogin} disabled={checking}
          style={{ background: "#3b82f6", border: "none", color: "#fff", borderRadius: 12, padding: "16px 20px", fontSize: 18, fontWeight: 700, cursor: "pointer", width: "100%", opacity: checking ? 0.5 : 1 }}>
          {checking ? "Loading..." : "Let's Go →"}
        </button>
        <p style={{ color: "#475569", fontSize: 12, textAlign: "center", marginTop: 16 }}>First time? Just pick a username and PIN — your account will be created automatically.</p>
      </div>
    </div>
  );
}

function RestTimer({ seconds, onDone, timerKey }) {
  const [left, setLeft] = useState(seconds), [total, setTotal] = useState(seconds), ref = useRef(null);
  useEffect(() => { setLeft(seconds); setTotal(seconds); }, [timerKey, seconds]);
  useEffect(() => { clearInterval(ref.current); ref.current = setInterval(() => setLeft(p => { if (p <= 1) { clearInterval(ref.current); sendNotif(); onDone(); return 0; } return p - 1; }), 1000); return () => clearInterval(ref.current); }, [timerKey, total]);
  const pct = (left / total) * 100, m = Math.floor(left / 60), s = left % 60;
  return (
    <div style={{ background: "#1e293b", borderRadius: 16, padding: 20, marginTop: 12, border: "1px solid #334155" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>REST TIMER</span>
        <div style={{ display: "flex", gap: 6 }}>{[-15,-5,5,15].map(a => <button key={a} onClick={() => { const n = Math.max(5, total + a); setTotal(n); setLeft(l => Math.max(0, Math.min(l + a, n))); }} style={{ background: "#334155", border: "none", color: "#cbd5e1", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: "pointer" }}>{a > 0 ? "+" : ""}{a}s</button>)}</div>
      </div>
      <div style={{ textAlign: "center", fontSize: 52, fontWeight: 700, color: left <= 10 ? "#ef4444" : "#60a5fa", fontFamily: "'DM Mono', monospace", letterSpacing: 2 }}>{m}:{s.toString().padStart(2, "0")}</div>
      <div style={{ background: "#0f172a", borderRadius: 8, height: 8, marginTop: 12, overflow: "hidden" }}><div style={{ background: left <= 10 ? "#ef4444" : "#3b82f6", height: "100%", width: `${pct}%`, transition: "width 1s linear", borderRadius: 8 }} /></div>
      <button onClick={() => { clearInterval(ref.current); onDone(); }} style={{ marginTop: 12, width: "100%", padding: 10, background: "#334155", border: "none", color: "#f8fafc", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Skip Rest</button>
    </div>
  );
}

function MuscleInfo({ muscles }) {
  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 14, marginBottom: 14, border: "1px solid #1e293b" }}>
      <div style={{ color: "#64748b", fontSize: 11, fontWeight: 600, marginBottom: 10, letterSpacing: 1 }}>MUSCLES WORKED</div>
      {muscles.map((m, i) => (
        <div key={i} style={{ marginBottom: i < muscles.length - 1 ? 10 : 0, paddingBottom: i < muscles.length - 1 ? 10 : 0, borderBottom: i < muscles.length - 1 ? "1px solid #1e293b" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.type === "primary" ? "#ef4444" : "#60a5fa", flexShrink: 0 }} />
            <span style={{ color: "#f8fafc", fontSize: 13, fontWeight: 600 }}>{m.name}</span>
            <span style={{ color: m.type === "primary" ? "#ef4444" : "#60a5fa", fontSize: 10, fontWeight: 700, background: m.type === "primary" ? "rgba(239,68,68,0.15)" : "rgba(96,165,250,0.15)", padding: "1px 6px", borderRadius: 8 }}>{m.type === "primary" ? "PRIMARY" : "SECONDARY"}</span>
          </div>
          <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.5, paddingLeft: 16 }}>{m.tip}</div>
        </div>
      ))}
    </div>
  );
}

function ExerciseLogger({ exercise, existingData, history, onSave, restTime, note, onSaveNote, customVideo, onSaveVideo }) {
  const [sets, setSets] = useState(() => existingData?.length ? JSON.parse(JSON.stringify(existingData)) : Array.from({ length: exercise.sets }, () => ({ weight: "", reps: "", rpe: "" })));
  const [timerKey, setTimerKey] = useState(null), [showGuide, setShowGuide] = useState(false);
  const [noteText, setNoteText] = useState(note || ""), [showNote, setShowNote] = useState(false);
  const [videoInput, setVideoInput] = useState(""), [showVideoEdit, setShowVideoEdit] = useState(false);
  useEffect(() => { setSets(existingData?.length ? JSON.parse(JSON.stringify(existingData)) : Array.from({ length: exercise.sets }, () => ({ weight: "", reps: "", rpe: "" }))); setTimerKey(null); setShowGuide(false); setNoteText(note || ""); setShowNote(false); setVideoInput(""); setShowVideoEdit(false); }, [exercise.id]);
  const update = (i, f, v) => { const n = [...sets]; n[i] = { ...n[i], [f]: v }; setSets(n); if (f === "rpe" && v && n[i].weight && n[i].reps) { setTimerKey(`${exercise.id}-${i}-${Date.now()}`); onSave(exercise.id, n); } };
  const saveWR = (i) => { if (sets[i].weight && sets[i].reps) onSave(exercise.id, sets); };
  const addSet = () => { const n = [...sets, { weight: "", reps: "", rpe: "" }]; setSets(n); };
  const removeSet = (i) => { if (sets.length <= 1) return; const n = sets.filter((_, j) => j !== i); setSets(n); onSave(exercise.id, n); };
  const extractVideoId = (url) => {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  };
  const saveCustomVideo = () => {
    const vid = extractVideoId(videoInput);
    if (vid) { onSaveVideo(exercise.id, vid); setShowVideoEdit(false); setVideoInput(""); }
    else if (videoInput.trim() === "") { onSaveVideo(exercise.id, ""); setShowVideoEdit(false); }
    else { alert("Couldn't find a YouTube video ID in that link. Make sure it's a full YouTube URL."); }
  };
  const videoId = customVideo || null;
  const searchEmbedUrl = guide ? getYTSearchEmbed(guide.yt + " Jeff Nippard") : null;
  const last = history?.length > 0 ? history[history.length - 1] : null;
  const guide = EXERCISE_GUIDES[exercise.id];
  const inp = { background: "#1e293b", border: "1px solid #334155", color: "#f8fafc", borderRadius: 8, padding: "10px 8px", fontSize: 16, textAlign: "center", width: "100%", outline: "none" };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, color: "#f8fafc", fontSize: 18, fontWeight: 700 }}>{exercise.name}</h3>
          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            <span style={{ background: muscleColors[exercise.muscle] || "#6366f1", color: "#fff", fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>{exercise.muscle}</span>
            <span style={{ background: "#1e293b", color: "#94a3b8", fontSize: 11, padding: "3px 10px", borderRadius: 20 }}>{exercise.sets}×{exercise.reps}</span>
            {exercise.superset && <span style={{ background: "#7c3aed", color: "#fff", fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>SUPERSET</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setShowNote(!showNote)} style={{ background: showNote ? "#f59e0b" : "#1e293b", border: showNote ? "none" : "1px solid #334155", color: "#fff", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{note ? "📝" : "✏️"}</button>
          <button onClick={() => setShowGuide(!showGuide)} style={{ background: showGuide ? "#dc2626" : "#1e293b", border: showGuide ? "none" : "1px solid #334155", color: "#fff", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{showGuide ? "✕" : "📖"}</button>
        </div>
      </div>

      {/* Previous note from last time */}
      {note && !showNote && <div style={{ background: "#1a1500", borderRadius: 10, padding: 12, marginBottom: 12, border: "1px solid #422006" }}>
        <div style={{ color: "#f59e0b", fontSize: 11, fontWeight: 600, marginBottom: 4, letterSpacing: 1 }}>📝 YOUR NOTE</div>
        <div style={{ color: "#fbbf24", fontSize: 13, lineHeight: 1.4 }}>{note}</div>
      </div>}

      {/* Note editor */}
      {showNote && <div style={{ background: "#0f172a", borderRadius: 12, padding: 14, marginBottom: 14, border: "1px solid #1e293b" }}>
        <div style={{ color: "#f59e0b", fontSize: 11, fontWeight: 600, marginBottom: 8, letterSpacing: 1 }}>EXERCISE NOTE</div>
        <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="e.g. Used rope instead of bar, felt it more in right shoulder..." style={{ background: "#1e293b", border: "1px solid #334155", color: "#f8fafc", borderRadius: 8, padding: 12, fontSize: 14, width: "100%", outline: "none", minHeight: 70, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={() => { onSaveNote(exercise.id, noteText); setShowNote(false); }} style={{ flex: 1, background: "#f59e0b", border: "none", color: "#000", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Save Note</button>
          {noteText && <button onClick={() => { setNoteText(""); onSaveNote(exercise.id, ""); setShowNote(false); }} style={{ background: "#1e293b", border: "1px solid #334155", color: "#ef4444", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Clear</button>}
        </div>
      </div>}

      {guide?.muscles && <MuscleInfo muscles={guide.muscles} />}
      {showGuide && guide && (
        <div style={{ background: "#0f172a", borderRadius: 14, padding: 16, marginBottom: 16, border: "1px solid #1e293b" }}>
          {/* YouTube Video — search embed by default, custom if saved */}
          {(videoId || searchEmbedUrl) && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 10, overflow: "hidden" }}>
                <iframe src={videoId ? `https://www.youtube.com/embed/${videoId}` : searchEmbedUrl} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={exercise.name + " form video"} />
              </div>
              <button onClick={() => setShowVideoEdit(!showVideoEdit)} style={{ background: "none", border: "none", color: "#475569", fontSize: 11, cursor: "pointer", marginTop: 6, padding: 2 }}>{showVideoEdit ? "Cancel" : videoId ? "Change video" : "Save a specific video"}</button>
            </div>
          )}
          {/* Custom video input */}
          {showVideoEdit && (
            <div style={{ marginBottom: 14, background: "#111827", borderRadius: 10, padding: 12, border: "1px solid #1e293b" }}>
              <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>PASTE YOUTUBE LINK</div>
              <input type="text" value={videoInput} onChange={e => setVideoInput(e.target.value)} placeholder="https://youtube.com/watch?v=..." style={{ background: "#1e293b", border: "1px solid #334155", color: "#f8fafc", borderRadius: 8, padding: "10px 12px", fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveCustomVideo} style={{ flex: 1, background: "#3b82f6", border: "none", color: "#fff", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Save Video</button>
                {videoId && <button onClick={() => { onSaveVideo(exercise.id, ""); setShowVideoEdit(false); }} style={{ background: "#1e293b", border: "1px solid #334155", color: "#ef4444", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Remove</button>}
              </div>
            </div>
          )}
          <div style={{ marginBottom: 14 }}><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}><span style={{ background: "#3b82f6", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>1</span><span style={{ color: "#60a5fa", fontSize: 13, fontWeight: 700 }}>SETUP</span></div><p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.5, margin: 0 }}>{guide.setup}</p></div>
          <div style={{ marginBottom: 14 }}><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}><span style={{ background: "#22c55e", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>2</span><span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700 }}>FORM</span></div><p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.5, margin: 0 }}>{guide.form}</p></div>
          <div><div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}><span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>3</span><span style={{ color: "#ef4444", fontSize: 13, fontWeight: 700 }}>COMMON MISTAKES</span></div><p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.5, margin: 0 }}>{guide.mistakes}</p></div>
        </div>
      )}
      {last && <div style={{ background: "#0f172a", borderRadius: 10, padding: 12, marginBottom: 14, border: "1px solid #1e293b" }}><div style={{ color: "#64748b", fontSize: 11, fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>LAST SESSION</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{last.sets.map((s, i) => { const c = s.rpe === "red" ? "#ef4444" : s.rpe === "yellow" ? "#f59e0b" : s.rpe === "green" ? "#22c55e" : "#94a3b8"; return <span key={i} style={{ color: "#94a3b8", fontSize: 12 }}>{s.weight}lb × {s.reps} <span style={{ color: c }}>●</span></span>; })}</div></div>}
      {sets.map((s, i) => (
        <div key={i} style={{ background: "#111827", borderRadius: 12, padding: 14, marginBottom: 8, border: s.weight && s.reps && s.rpe ? "1px solid #22c55e30" : "1px solid #1f2937" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ color: s.weight && s.reps && s.rpe ? "#22c55e" : "#3b82f6", fontSize: 14, fontWeight: 700, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: s.weight && s.reps && s.rpe ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.15)" }}>{s.weight && s.reps && s.rpe ? "✓" : i + 1}</div>
            <span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, flex: 1 }}>Set {i + 1}</span>
            {sets.length > 1 && <button onClick={() => removeSet(i)} style={{ background: "none", border: "none", color: "#ef4444", fontSize: 16, cursor: "pointer", padding: "4px 8px" }}>×</button>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div><div style={{ color: "#475569", fontSize: 10, fontWeight: 700, marginBottom: 4, textAlign: "center" }}>WEIGHT (lbs)</div><input type="number" value={s.weight} onChange={e => update(i, "weight", e.target.value)} onBlur={() => saveWR(i)} placeholder="0" style={inp} /></div>
            <div><div style={{ color: "#475569", fontSize: 10, fontWeight: 700, marginBottom: 4, textAlign: "center" }}>REPS</div><input type="number" value={s.reps} onChange={e => update(i, "reps", e.target.value)} onBlur={() => saveWR(i)} placeholder="0" style={inp} /></div>
          </div>
          <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, marginBottom: 6 }}>HOW DID IT FEEL?</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {RPE_OPTIONS.map(o => <button key={o.value} onPointerDown={(e) => { e.preventDefault(); update(i, "rpe", o.value); }} style={{ background: s.rpe === o.value ? o.bg : "#0f172a", border: s.rpe === o.value ? `2px solid ${o.color}` : "1px solid #1e293b", borderRadius: 8, padding: "8px 4px", cursor: "pointer", textAlign: "center", touchAction: "manipulation" }}><div style={{ fontSize: 16, marginBottom: 2 }}>{o.icon}</div><div style={{ color: s.rpe === o.value ? o.color : "#64748b", fontSize: 10, fontWeight: 700 }}>{o.label}</div></button>)}
          </div>
        </div>
      ))}
      <button onClick={addSet} style={{ width: "100%", padding: 12, background: "#0f172a", border: "1px dashed #334155", color: "#64748b", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>+ Add Set</button>
      {timerKey !== null && <RestTimer seconds={restTime} timerKey={timerKey} onDone={() => setTimerKey(null)} />}
    </div>
  );
}

function GoalBar({ current, goal, color, invert }) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 120) : 0;
  const over = invert && current > goal;
  return (<div style={{ marginTop: 8 }}><div style={{ background: "#0f172a", borderRadius: 6, height: 8, overflow: "hidden" }}><div style={{ background: over ? "#ef4444" : color, height: "100%", width: `${Math.min(pct, 100)}%`, borderRadius: 6, transition: "width 0.3s" }} /></div></div>);
}

function CelebrationScreen({ workout, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 5000); return () => clearTimeout(t); }, []);
  return (
    <div style={{ background: "#030712", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 40, textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ fontSize: 72 }}>🎉</div>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#f8fafc" }}>Workout Complete!</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 24 }}>{(WORKOUTS[workout] || AB_WORKOUTS[workout])?.icon}</span><span style={{ fontSize: 20, fontWeight: 700, color: (WORKOUTS[workout] || AB_WORKOUTS[workout])?.color }}>{(WORKOUTS[workout] || AB_WORKOUTS[workout])?.name}</span></div>
      <p style={{ color: "#64748b", fontSize: 15, maxWidth: 280, lineHeight: 1.5 }}>{(WORKOUTS[workout] || AB_WORKOUTS[workout])?.subtitle} — crushed it. Recovery starts now.</p>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>{["💪", "🔥", "👊"].map((e, i) => <span key={i} style={{ fontSize: 32 }}>{e}</span>)}</div>
      <button onClick={onDone} style={{ marginTop: 20, background: "#3b82f6", border: "none", color: "#fff", borderRadius: 12, padding: "14px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>Back to Home →</button>
    </div>
  );
}

function CalendarView({ workoutLogs, config, daily, onStartWorkout, onSaveDaily, goals }) {
  const [mo, setMo] = useState(new Date().getMonth()), [yr, setYr] = useState(new Date().getFullYear()), [sel, setSel] = useState(null);
  const [editSteps, setEditSteps] = useState(""), [editCals, setEditCals] = useState("");
  const todayStr = TODAY(), cs = { background: "#111827", borderRadius: 16, padding: 18, border: "1px solid #1f2937" };
  const dim = new Date(yr, mo + 1, 0).getDate(), fdow = new Date(yr, mo, 1).getDay();
  const mn = new Date(yr, mo).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const pm = () => { mo === 0 ? (setMo(11), setYr(yr - 1)) : setMo(mo - 1); setSel(null); };
  const nm = () => { mo === 11 ? (setMo(0), setYr(yr + 1)) : setMo(mo + 1); setSel(null); };
  useEffect(() => { if (sel && daily[sel]) { setEditSteps(daily[sel].steps?.toString() || ""); setEditCals(daily[sel].calories?.toString() || ""); } else { setEditSteps(""); setEditCals(""); } }, [sel]);
  const gwfd = (ds) => {
    // Always show completed workouts first (never delete these)
    if (workoutLogs[ds]) return { type: workoutLogs[ds].type, completed: true };
    // Past dates with no log = no workout
    const t = new Date(ds), td = new Date(todayStr);
    if (t < td) return null;
    // Today and future: project based on current config
    let lld = config.lastWorkoutDate, lt = config.lastWorkout;
    if (!lld || !lt) { lld = todayStr; lt = "D"; }
    const df = Math.floor((t - new Date(lld)) / 86400000);
    if (df <= 0 || df % 2 !== 0) return null;
    return { type: WORKOUT_ORDER[(WORKOUT_ORDER.indexOf(lt) + df / 2) % 4], completed: false };
  };
  const tw = Object.keys(workoutLogs).length;
  const iS = { background: "#1e293b", border: "1px solid #334155", color: "#f8fafc", borderRadius: 8, padding: "10px 12px", fontSize: 16, width: "100%", outline: "none", boxSizing: "border-box" };
  const swd = sel ? gwfd(sel) : null;
  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}><span style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: 24, fontWeight: 800 }}>BVS</span><h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "#94a3b8" }}>Calendar</h1></div>
      <div style={{ background: "linear-gradient(180deg, #111827, #0a0f1a)", borderRadius: 20, padding: 16, border: "1px solid #1f2937" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}><button onClick={pm} style={{ background: "#1e293b", border: "none", color: "#f8fafc", borderRadius: 10, padding: "8px 14px", fontSize: 16, cursor: "pointer", fontWeight: 600 }}>←</button><span style={{ color: "#f8fafc", fontSize: 17, fontWeight: 700 }}>{mn}</span><button onClick={nm} style={{ background: "#1e293b", border: "none", color: "#f8fafc", borderRadius: 10, padding: "8px 14px", fontSize: 16, cursor: "pointer", fontWeight: 600 }}>→</button></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>{["S","M","T","W","T","F","S"].map((d, i) => <div key={i} style={{ color: "#475569", fontSize: 10, fontWeight: 700, textAlign: "center", padding: 3 }}>{d}</div>)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
          {Array.from({ length: fdow }, (_, i) => <div key={`e${i}`} style={{ aspectRatio: "1" }} />)}
          {Array.from({ length: dim }, (_, i) => { const day = i+1, ds = `${yr}-${String(mo+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`; const w = gwfd(ds), isT = ds === todayStr, isS = ds === sel, isP = new Date(ds) < new Date(todayStr); const dc = w ? WORKOUTS[w.type]?.color : null, wi = w ? WORKOUTS[w.type]?.icon : null;
            return <button key={day} onClick={() => setSel(ds === sel ? null : ds)} style={{ aspectRatio: "1", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, cursor: "pointer", background: isS ? "#1e293b" : w?.completed ? `${dc}20` : "transparent", border: isT ? "2px solid #3b82f6" : isS ? "1px solid #334155" : "1px solid transparent", color: isP && !w ? "#334155" : isT ? "#3b82f6" : "#f8fafc", fontSize: 13, fontWeight: isT ? 800 : 500, boxShadow: isT ? "0 0 12px rgba(59,130,246,0.3)" : "none" }}><span>{day}</span>{w && <span style={{ fontSize: 6, opacity: w.completed ? 1 : 0.4 }}>{wi}</span>}</button>;
          })}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "center", flexWrap: "wrap", padding: "8px 0 2px", borderTop: "1px solid #1f2937" }}>
          {WORKOUT_ORDER.map(k => <div key={k} style={{ display: "flex", alignItems: "center", gap: 4, background: "#0f172a", borderRadius: 16, padding: "3px 8px" }}><span style={{ fontSize: 8 }}>{WORKOUTS[k].icon}</span><span style={{ color: WORKOUTS[k].color, fontSize: 10, fontWeight: 700 }}>{k}</span></div>)}
        </div>
      </div>
      {sel && <div style={{ ...cs, marginTop: 12, borderLeft: swd ? `3px solid ${WORKOUTS[swd.type]?.color}` : "3px solid #334155" }}>
        <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, letterSpacing: 1, marginBottom: 10 }}>{new Date(sel + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
        <div style={{ background: "#0f172a", borderRadius: 12, padding: 14, marginBottom: 12, border: "1px solid #1e293b" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div><div style={{ color: "#475569", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>👟 STEPS</div><input type="number" value={editSteps} onChange={e => setEditSteps(e.target.value)} placeholder="0" style={iS} /></div>
            <div><div style={{ color: "#475569", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>🔥 CALS BURNED</div><input type="number" value={editCals} onChange={e => setEditCals(e.target.value)} placeholder="0" style={iS} /></div>
          </div>
          <button onClick={() => onSaveDaily(sel, parseInt(editSteps) || 0, parseInt(editCals) || 0)} style={{ marginTop: 10, width: "100%", padding: 10, background: "#3b82f6", border: "none", color: "#fff", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save</button>
        </div>
        {swd ? <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><span style={{ fontSize: 20 }}>{WORKOUTS[swd.type].icon}</span><span style={{ fontSize: 18, fontWeight: 700 }}>{WORKOUTS[swd.type].name}</span>{swd.completed ? <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 600, background: "rgba(34,197,94,0.15)", padding: "2px 8px", borderRadius: 12 }}>✓ Done</span> : <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 600, background: "rgba(245,158,11,0.15)", padding: "2px 8px", borderRadius: 12 }}>Scheduled</span>}</div>
          {swd.completed && workoutLogs[sel]?.exercises && <div style={{ borderTop: "1px solid #1f2937", paddingTop: 10 }}>{WORKOUTS[swd.type].exercises.map(ex => { const lg = workoutLogs[sel].exercises[ex.id]; return <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #0f172a" }}><span style={{ color: "#cbd5e1", fontSize: 12 }}>{ex.name}</span><span style={{ color: "#64748b", fontSize: 11 }}>{lg ? lg.sets.filter(s => s.weight).map(s => `${s.weight}×${s.reps}`).join(", ") : "—"}</span></div>; })}</div>}
          {sel === todayStr && !swd.completed && <button onClick={() => onStartWorkout(swd.type)} style={{ background: WORKOUTS[swd.type].color, border: "none", color: "#fff", borderRadius: 12, padding: "14px 20px", fontSize: 16, fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 8 }}>Start {WORKOUTS[swd.type].name} →</button>}
        </div> : <div style={{ color: "#64748b", fontSize: 14 }}>😴 Rest day</div>}
      </div>}
    </div>
  );
}

// ─── Main App ───
export default function App() {
  const [user, setUser] = useState(null), [userPin, setUserPin] = useState(null);
  const [view, setView] = useState("dashboard"), [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({ restTime: 90, lastWorkout: null, lastWorkoutDate: null });
  const [goals, setGoals] = useState({ steps: 7500, calories: 2000 });
  const [weights, setWeights] = useState({}), [daily, setDaily] = useState({}), [workoutLogs, setWorkoutLogs] = useState({}), [mealLogs, setMealLogs] = useState({});
  const [activeWorkout, setActiveWorkout] = useState(null), [activeExercise, setActiveExercise] = useState(null), [progressExercise, setProgressExercise] = useState(null);
  const [weightInput, setWeightInput] = useState(""), [stepsInput, setStepsInput] = useState(""), [calInput, setCalInput] = useState("");
  const [mealName, setMealName] = useState(""), [mealCals, setMealCals] = useState(""), [mealProtein, setMealProtein] = useState("");
  const [celebrationWorkout, setCelebrationWorkout] = useState(null), [editGoals, setEditGoals] = useState(false);
  const [exerciseNotes, setExerciseNotes] = useState({});
  const [customVideos, setCustomVideos] = useState({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const today = TODAY();

  // Check for saved session
  useEffect(() => {
    const saved = localStorage.getItem("bvs-session");
    if (saved) { const s = JSON.parse(saved); setUser(s.username); setUserPin(s.pin); }
    else setLoading(false);
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  }, []);

  // Load data when user is set
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [c, w, d, wl, ml, g, en, cv] = await Promise.all([
        loadData(user, "ft-config", { restTime: 90, lastWorkout: null, lastWorkoutDate: null }),
        loadData(user, "ft-weights", {}),
        loadData(user, "ft-daily", {}),
        loadData(user, "ft-workouts", {}),
        loadData(user, "ft-meals", {}),
        loadData(user, "ft-goals", { steps: 7500, calories: 2000 }),
        loadData(user, "ft-notes", {}),
        loadData(user, "ft-videos", {}),
      ]);
      setConfig(c); setWeights(w); setDaily(d); setWorkoutLogs(wl); setMealLogs(ml); setGoals(g); setExerciseNotes(en); setCustomVideos(cv);
      if (w[today]) setWeightInput(w[today].toString());
      if (d[today]) { setStepsInput(d[today].steps?.toString() || ""); setCalInput(d[today].calories?.toString() || ""); }
      setLoading(false);
    })();
  }, [user]);

  const handleLogin = (username, pin) => {
    setUser(username); setUserPin(pin);
    localStorage.setItem("bvs-session", JSON.stringify({ username, pin }));
  };
  const handleLogout = () => {
    localStorage.removeItem("bvs-session");
    setUser(null); setUserPin(null); setView("dashboard");
  };

  // Save helpers — all include username and pin
  const sv = async (key, value) => { if (user && userPin) await saveData(user, userPin, key, value); };
  const gnw = useCallback(() => config.lastWorkout ? WORKOUT_ORDER[(WORKOUT_ORDER.indexOf(config.lastWorkout) + 1) % 4] : "A", [config]);
  const gnaw = useCallback(() => config.lastAbWorkout ? AB_ORDER[(AB_ORDER.indexOf(config.lastAbWorkout) + 1) % 3] : "Ab1", [config]);
  const getWorkout = (key) => WORKOUTS[key] || AB_WORKOUTS[key] || null;
  const iwd = useCallback(() => { if (!config.lastWorkoutDate) return true; const d = Math.floor((new Date(today) - new Date(config.lastWorkoutDate)) / 86400000); return d >= 2 || d < 0; }, [config, today]);
  const twt = workoutLogs[today]?.type || null;

  const sW = async v => { const n = { ...weights, [today]: parseFloat(v) }; setWeights(n); await sv("ft-weights", n); };
  const sD = async (date, steps, cals) => { const n = { ...daily, [date]: { steps, calories: cals } }; setDaily(n); await sv("ft-daily", n); if (date === today) { setStepsInput(steps.toString()); setCalInput(cals.toString()); } };
  const sE = async (wt, eid, sd) => { const ex = workoutLogs[today] || { type: wt, exercises: {} }; ex.type = wt; ex.exercises[eid] = { sets: sd }; const n = { ...workoutLogs, [today]: ex }; setWorkoutLogs(n); await sv("ft-workouts", n); };
  const aM = async () => { if (!mealName || !mealCals) return; const m = { id: Date.now(), name: mealName, calories: parseInt(mealCals) || 0, protein: parseInt(mealProtein) || 0, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }; const n = { ...mealLogs, [today]: [...(mealLogs[today] || []), m] }; setMealLogs(n); await sv("ft-meals", n); setMealName(""); setMealCals(""); setMealProtein(""); };
  const dM = async mid => { const n = { ...mealLogs, [today]: (mealLogs[today] || []).filter(m => m.id !== mid) }; setMealLogs(n); await sv("ft-meals", n); };
  const startW = t => { setActiveWorkout(t); setActiveExercise(0); setView("workout-active"); };
  const finishW = () => {
    const c = activeWorkout;
    const existing = workoutLogs[today] || { type: c, exercises: {} };
    existing.type = c;
    const nw = { ...workoutLogs, [today]: existing };
    setWorkoutLogs(nw); sv("ft-workouts", nw);
    setCelebrationWorkout(c); setView("celebration"); setActiveWorkout(null); setActiveExercise(null);
    const isAb = AB_ORDER.includes(c);
    const nc = isAb ? { ...config, lastAbWorkout: c } : { ...config, lastWorkout: c, lastWorkoutDate: today };
    setConfig(nc); sv("ft-config", nc);
  };
  const skipWorkout = () => {
    // Don't advance rotation — just make today rest, tomorrow = same workout
    // Set lastWorkoutDate to yesterday so: today diff=1 (rest), tomorrow diff=2 (workout day with same gnw)
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const nc = { ...config, lastWorkoutDate: yesterday.toISOString().split("T")[0] };
    setConfig(nc); sv("ft-config", nc);
  };
  const realignSchedule = () => {
    // Make today a workout day with the next workout in rotation (the one you were supposed to do)
    // Set lastWorkoutDate to 2 days ago so today diff=2 (workout day), keeps same gnw
    const twoDaysAgo = new Date(); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const nc = { ...config, lastWorkoutDate: twoDaysAgo.toISOString().split("T")[0] };
    setConfig(nc); sv("ft-config", nc);
  };
  const workOutToday = () => { realignSchedule(); };
  const geh = eid => { const h = []; Object.keys(workoutLogs).sort().forEach(d => { const l = workoutLogs[d]; if (l.exercises?.[eid]) h.push({ date: d, ...l.exercises[eid] }); }); return h; };
  const saveNote = async (eid, note) => { const n = { ...exerciseNotes, [eid]: note }; setExerciseNotes(n); await sv("ft-notes", n); };
  const saveVideo = async (eid, videoId) => { const n = { ...customVideos, [eid]: videoId }; setCustomVideos(n); await sv("ft-videos", n); };
  const resetAll = async () => {
    const empty = {};
    const defConfig = { restTime: 90, lastWorkout: null, lastWorkoutDate: null };
    const defGoals = { steps: 7500, calories: 2000 };
    setConfig(defConfig); setWeights(empty); setDaily(empty); setWorkoutLogs(empty); setMealLogs(empty); setGoals(defGoals); setExerciseNotes(empty); setCustomVideos(empty);
    setWeightInput(""); setStepsInput(""); setCalInput("");
    await sv("ft-config", defConfig); await sv("ft-weights", empty); await sv("ft-daily", empty);
    await sv("ft-workouts", empty); await sv("ft-meals", empty); await sv("ft-goals", defGoals); await sv("ft-notes", empty); await sv("ft-videos", empty);
    setShowResetConfirm(false);
  };
  const saveGoals2 = async (g) => { setGoals(g); await sv("ft-goals", g); setEditGoals(false); };
  const exp = async () => { const d = { config, weights, daily, workoutLogs, mealLogs, goals, exportDate: new Date().toISOString() }; const b = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }), u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `bvs-backup-${today}.json`; a.click(); URL.revokeObjectURL(u); };

  const wcd = Object.entries(weights).sort(([a], [b]) => a.localeCompare(b)).slice(-30).map(([d, w]) => ({ date: d.slice(5), weight: w }));
  const tm = mealLogs[today] || [], tc = tm.reduce((s, m) => s + m.calories, 0), tp = tm.reduce((s, m) => s + m.protein, 0);
  const todaySteps = parseInt(stepsInput) || daily[today]?.steps || 0, todayCals = parseInt(calInput) || daily[today]?.calories || 0;
  const iS = { background: "#1e293b", border: "1px solid #334155", color: "#f8fafc", borderRadius: 10, padding: "12px 14px", fontSize: 16, width: "100%", outline: "none", boxSizing: "border-box" };
  const cS = { background: "#111827", borderRadius: 16, padding: 18, border: "1px solid #1f2937" };
  const bP = { background: "#3b82f6", border: "none", color: "#fff", borderRadius: 12, padding: "14px 20px", fontSize: 16, fontWeight: 700, cursor: "pointer", width: "100%" };

  // Show login if no user
  if (!user) return <LoginScreen onLogin={handleLogin} />;
  if (loading) return <div style={{ background: "#030712", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}><div style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: 36, fontWeight: 800 }}>BVS</div><div style={{ color: "#64748b", fontSize: 14 }}>Loading your gains...</div></div>;
  if (view === "celebration" && celebrationWorkout) return <CelebrationScreen workout={celebrationWorkout} onDone={() => { setCelebrationWorkout(null); setView("dashboard"); }} />;

  if (view === "workout-active" && activeWorkout) {
    const wo = getWorkout(activeWorkout), ex = wo.exercises[activeExercise], tl = workoutLogs[today];
    const cc = tl ? Object.keys(tl.exercises || {}).filter(e => tl.exercises[e]?.sets?.every(s => s.weight && s.reps && s.rpe)).length : 0;
    return (
      <div style={{ background: "#030712", minHeight: "100vh", color: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1f2937", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => { setView("dashboard"); setActiveWorkout(null); }} style={{ background: "none", border: "none", color: "#60a5fa", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>← Back</button>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 700 }}>{wo.icon} {wo.name}</div><div style={{ fontSize: 12, color: "#64748b" }}>{cc}/{wo.exercises.length}</div></div>
          <button onClick={finishW} style={{ background: "#22c55e", border: "none", color: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Finish</button>
        </div>
        <div style={{ display: "flex", gap: 6, padding: "12px 20px", overflowX: "auto" }}>
          {wo.exercises.map((e, i) => { const done = tl?.exercises?.[e.id]?.sets?.every(s => s.weight && s.reps && s.rpe); return <button key={i} onClick={() => setActiveExercise(i)} style={{ background: i === activeExercise ? "#3b82f6" : done ? "rgba(34,197,94,0.2)" : "#1e293b", border: done && i !== activeExercise ? "1px solid #22c55e" : "1px solid transparent", color: i === activeExercise ? "#fff" : done ? "#22c55e" : "#94a3b8", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0, minWidth: 36 }}>{done ? "✓" : i + 1}</button>; })}
        </div>
        <div style={{ padding: 20, paddingBottom: 100 }}>
          <ExerciseLogger key={ex.id} exercise={ex} existingData={tl?.exercises?.[ex.id]?.sets} history={geh(ex.id)} restTime={config.restTime} onSave={(eid, sd) => sE(activeWorkout, eid, sd)} note={exerciseNotes[ex.id] || ""} onSaveNote={saveNote} customVideo={customVideos[ex.id] || ""} onSaveVideo={saveVideo} />
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={() => setActiveExercise(Math.max(0, activeExercise - 1))} disabled={activeExercise === 0} style={{ ...bP, background: "#1e293b", opacity: activeExercise === 0 ? 0.4 : 1 }}>← Prev</button>
            <button onClick={() => setActiveExercise(Math.min(wo.exercises.length - 1, activeExercise + 1))} disabled={activeExercise === wo.exercises.length - 1} style={{ ...bP, opacity: activeExercise === wo.exercises.length - 1 ? 0.4 : 1 }}>Next →</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "progress-detail" && progressExercise) {
    const hist = geh(progressExercise.id), cd = hist.map(h => ({ date: h.date.slice(5), weight: Math.max(...h.sets.map(s => parseFloat(s.weight) || 0)), volume: h.sets.reduce((s, st) => s + (parseFloat(st.weight) || 0) * (parseInt(st.reps) || 0), 0) }));
    const guide = EXERCISE_GUIDES[progressExercise.id];
    return (
      <div style={{ background: "#030712", minHeight: "100vh", color: "#f8fafc", fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1f2937" }}><button onClick={() => { setView("progress"); setProgressExercise(null); }} style={{ background: "none", border: "none", color: "#60a5fa", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>← Back</button></div>
        <div style={{ padding: 20 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700 }}>{progressExercise.name}</h2>
          <p style={{ color: "#64748b", margin: "0 0 16px", fontSize: 14 }}>{hist.length} sessions</p>
          {guide?.muscles && <MuscleInfo muscles={guide.muscles} />}
          {cd.length > 1 ? <><div style={cS}><h4 style={{ margin: "0 0 12px", color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>MAX WEIGHT</h4><ResponsiveContainer width="100%" height={180}><LineChart data={cd}><XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} /><YAxis tick={{ fill: "#64748b", fontSize: 11 }} /><Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, color: "#f8fafc" }} /><Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 4 }} /></LineChart></ResponsiveContainer></div><div style={{ ...cS, marginTop: 12 }}><h4 style={{ margin: "0 0 12px", color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>TOTAL VOLUME</h4><ResponsiveContainer width="100%" height={180}><BarChart data={cd}><XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} /><YAxis tick={{ fill: "#64748b", fontSize: 11 }} /><Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, color: "#f8fafc" }} /><Bar dataKey="volume" fill="#22c55e" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></> : <div style={{ ...cS, textAlign: "center", color: "#64748b" }}><p>Log 2+ sessions to see charts.</p></div>}
          <div style={{ marginTop: 16 }}><h4 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, margin: "0 0 10px" }}>SESSION HISTORY</h4>{hist.slice().reverse().map((h, i) => <div key={i} style={{ ...cS, marginBottom: 8, padding: 14 }}><div style={{ color: "#60a5fa", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{h.date}</div><div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>{h.sets.map((s, j) => { const c = s.rpe === "red" ? "#ef4444" : s.rpe === "yellow" ? "#f59e0b" : s.rpe === "green" ? "#22c55e" : "#94a3b8"; return <span key={j} style={{ color: "#cbd5e1", fontSize: 13 }}>Set {j+1}: {s.weight}lb × {s.reps} <span style={{ color: c }}>●</span></span>; })}</div></div>)}</div>
        </div>
      </div>
    );
  }

  const nav = [{ id: "dashboard", icon: "◉", label: "Home" }, { id: "calendar", icon: "📅", label: "Calendar" }, { id: "workout", icon: "⚡", label: "Workout" }, { id: "meals", icon: "🍽", label: "Meals" }, { id: "progress", icon: "📈", label: "Progress" }];
  return (
    <div style={{ background: "#030712", minHeight: "100vh", color: "#f8fafc", fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      {view === "dashboard" && <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}><div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>BVS</span><h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "#94a3b8" }}>Workout</h1></div><p style={{ margin: "2px 0 0", color: "#64748b", fontSize: 14 }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} • <span style={{ color: "#3b82f6" }}>{user}</span></p></div><div style={{ display: "flex", gap: 8 }}><button onClick={exp} style={{ background: "#1e293b", border: "none", color: "#94a3b8", borderRadius: 8, padding: "8px 10px", fontSize: 11, cursor: "pointer" }}>Export</button><button onClick={handleLogout} style={{ background: "#1e293b", border: "none", color: "#ef4444", borderRadius: 8, padding: "8px 10px", fontSize: 11, cursor: "pointer" }}>Logout</button></div></div>
        <div style={cS}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>⚖️ DAILY WEIGHT</span>{weights[today] && <span style={{ color: "#22c55e", fontSize: 12 }}>✓ {weights[today]} lbs</span>}</div><div style={{ display: "flex", gap: 10 }}><input type="number" value={weightInput} onChange={e => setWeightInput(e.target.value)} placeholder="lbs" style={iS} /><button onClick={() => { if (weightInput) sW(weightInput); }} style={{ background: "#3b82f6", border: "none", color: "#fff", borderRadius: 10, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Save</button></div>{wcd.length > 2 && <div style={{ marginTop: 12 }}><ResponsiveContainer width="100%" height={70}><LineChart data={wcd}><XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 9 }} /><Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, color: "#f8fafc", fontSize: 12 }} /><Line type="monotone" dataKey="weight" stroke="#60a5fa" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div style={cS}><span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>👟 STEPS</span><input type="number" value={stepsInput} onChange={e => setStepsInput(e.target.value)} onBlur={() => sD(today, parseInt(stepsInput) || 0, parseInt(calInput) || 0)} placeholder="0" style={{ ...iS, marginTop: 8, fontSize: 20, fontWeight: 700, padding: "10px 12px" }} /><GoalBar current={todaySteps} goal={goals.steps} color="#22c55e" /></div>
          <div style={cS}><span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>🔥 CALS BURNED</span><input type="number" value={calInput} onChange={e => setCalInput(e.target.value)} onBlur={() => sD(today, parseInt(stepsInput) || 0, parseInt(calInput) || 0)} placeholder="0" style={{ ...iS, marginTop: 8, fontSize: 20, fontWeight: 700, padding: "10px 12px" }} /><GoalBar current={todayCals} goal={goals.calories} color="#f59e0b" invert /></div>
        </div>
        <button onClick={() => setEditGoals(!editGoals)} style={{ background: "none", border: "none", color: "#475569", fontSize: 12, cursor: "pointer", marginTop: 8, padding: "4px 0" }}>{editGoals ? "Hide goals" : "⚙️ Edit goals"}</button>
        {editGoals && <div style={{ ...cS, marginTop: 4, padding: 14 }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><div><div style={{ color: "#475569", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>STEP GOAL</div><input type="number" value={goals.steps} onChange={e => saveGoals2({ ...goals, steps: parseInt(e.target.value) || 0 })} style={{ ...iS, padding: "8px 10px", fontSize: 16 }} /></div><div><div style={{ color: "#475569", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>CALORIE LIMIT</div><input type="number" value={goals.calories} onChange={e => saveGoals2({ ...goals, calories: parseInt(e.target.value) || 0 })} style={{ ...iS, padding: "8px 10px", fontSize: 16 }} /></div></div></div>}
        <div style={{ ...cS, marginTop: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>🥗 NUTRITION</span><button onClick={() => setView("meals")} style={{ background: "none", border: "none", color: "#60a5fa", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add →</button></div><div style={{ display: "flex", gap: 20, marginTop: 12 }}><div><span style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b" }}>{tc}</span><span style={{ color: "#64748b", fontSize: 13, marginLeft: 4 }}>cal</span></div><div><span style={{ fontSize: 28, fontWeight: 700, color: "#22c55e" }}>{tp}g</span><span style={{ color: "#64748b", fontSize: 13, marginLeft: 4 }}>protein</span></div></div></div>
        <div style={{ ...cS, marginTop: 12 }}><span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>🏋️ TODAY'S WORKOUT</span>{twt ? <div style={{ marginTop: 10 }}><div style={{ color: "#22c55e", fontSize: 16, fontWeight: 700 }}>✓ {getWorkout(twt)?.name || twt} Completed</div><button onClick={() => startW(twt)} style={{ ...bP, background: "#1e293b", marginTop: 10, fontSize: 14 }}>View / Edit →</button></div> : iwd() ? <div style={{ marginTop: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 18 }}>{WORKOUTS[gnw()]?.icon}</span><div style={{ color: "#f8fafc", fontSize: 16, fontWeight: 700 }}>{WORKOUTS[gnw()].name}</div></div><div style={{ color: "#64748b", fontSize: 13, marginBottom: 12, marginTop: 4 }}>{WORKOUTS[gnw()].subtitle}</div><button onClick={() => startW(gnw())} style={bP}>Start Workout →</button><button onClick={skipWorkout} style={{ background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", marginTop: 10, width: "100%", padding: 8 }}>Skip — do this one tomorrow instead</button></div> : <div style={{ marginTop: 10 }}><div style={{ color: "#64748b", fontSize: 14, marginBottom: 12 }}>😴 Rest day — <span style={{ color: "#94a3b8" }}>next up: {WORKOUTS[gnw()]?.name}</span></div><button onClick={workOutToday} style={{ ...bP, background: "#1e293b" }}>I'm working out today →</button><button onClick={() => startW(gnaw())} style={{ ...bP, background: "linear-gradient(135deg, #f97316, #ea580c)", marginTop: 8 }}>🟠 Do Abs — {AB_WORKOUTS[gnaw()]?.name} →</button></div>}<button onClick={realignSchedule} style={{ background: "none", border: "none", color: "#475569", fontSize: 11, cursor: "pointer", marginTop: 8, width: "100%", padding: 4 }}>🔄 Realign schedule from today</button></div>

        {/* Reset All */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          {!showResetConfirm ? (
            <button onClick={() => setShowResetConfirm(true)} style={{ background: "none", border: "none", color: "#334155", fontSize: 12, cursor: "pointer", padding: 8 }}>Reset All Data</button>
          ) : (
            <div style={{ ...cS, border: "1px solid #7f1d1d", background: "#0f0506" }}>
              <div style={{ color: "#ef4444", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Are you sure?</div>
              <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 14 }}>This will permanently delete all your workout logs, weight history, meals, and settings. This cannot be undone.</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowResetConfirm(false)} style={{ flex: 1, background: "#1e293b", border: "none", color: "#f8fafc", borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={resetAll} style={{ flex: 1, background: "#dc2626", border: "none", color: "#fff", borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Yes, Reset Everything</button>
              </div>
            </div>
          )}
        </div>
      </div>}

      {view === "calendar" && <CalendarView workoutLogs={workoutLogs} config={config} daily={daily} goals={goals} onStartWorkout={startW} onSaveDaily={sD} />}

      {view === "workout" && <div style={{ padding: 20 }}>
        <h1 style={{ margin: "0 0 20px", fontSize: 26, fontWeight: 700 }}>Workouts</h1>
        {WORKOUT_ORDER.map(k => { const w = WORKOUTS[k], isN = gnw() === k && iwd(); return <div key={k} style={{ ...cS, marginBottom: 12, border: isN ? `1px solid ${w.color}` : "1px solid #1f2937" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 18 }}>{w.icon}</span><div><div style={{ fontSize: 18, fontWeight: 700 }}>{w.name}</div><div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{w.subtitle}</div></div></div>{isN && <span style={{ background: w.color, color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20 }}>NEXT</span>}</div><button onClick={() => startW(k)} style={{ ...bP, marginTop: 12, background: isN ? w.color : "#1e293b", fontSize: 14 }}>{isN ? "Start →" : "Preview →"}</button></div>; })}
        <div style={{ ...cS, marginTop: 20 }}><span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>⏱️ REST TIMER</span><div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}><input type="number" value={config.restTime} onChange={async e => { const n = { ...config, restTime: parseInt(e.target.value) || 90 }; setConfig(n); await sv("ft-config", n); }} style={{ ...iS, width: 80, textAlign: "center", fontSize: 20, fontWeight: 700 }} /><span style={{ color: "#64748b" }}>seconds</span></div></div>
      </div>}

      {view === "meals" && <div style={{ padding: 20 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 700 }}>Meal Log</h1><p style={{ color: "#64748b", margin: "0 0 20px", fontSize: 14 }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}><div style={{ ...cS, textAlign: "center" }}><div style={{ color: "#f59e0b", fontSize: 32, fontWeight: 700 }}>{tc}</div><div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>CALORIES</div></div><div style={{ ...cS, textAlign: "center" }}><div style={{ color: "#22c55e", fontSize: 32, fontWeight: 700 }}>{tp}g</div><div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>PROTEIN</div></div></div>
        <div style={cS}><span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, letterSpacing: 1, display: "block", marginBottom: 12 }}>ADD MEAL</span><input type="text" value={mealName} onChange={e => setMealName(e.target.value)} placeholder="What did you eat?" style={{ ...iS, marginBottom: 10 }} /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><input type="number" value={mealCals} onChange={e => setMealCals(e.target.value)} placeholder="Calories" style={iS} /><input type="number" value={mealProtein} onChange={e => setMealProtein(e.target.value)} placeholder="Protein (g)" style={iS} /></div><button onClick={aM} style={{ ...bP, marginTop: 12 }}>Add Meal</button></div>
        {tm.length > 0 && <div style={{ marginTop: 16 }}><span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>TODAY'S MEALS</span>{tm.map(m => <div key={m.id} style={{ ...cS, marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</div><div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{m.time} • {m.calories} cal • {m.protein}g</div></div><button onClick={() => dM(m.id)} style={{ background: "none", border: "none", color: "#ef4444", fontSize: 18, cursor: "pointer", padding: 8 }}>×</button></div>)}</div>}
      </div>}

      {view === "progress" && <div style={{ padding: 20 }}>
        <h1 style={{ margin: "0 0 20px", fontSize: 26, fontWeight: 700 }}>Progress</h1>
        <div style={cS}><span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>⚖️ BODY WEIGHT</span>{wcd.length > 0 ? <div><div style={{ display: "flex", gap: 16, marginTop: 12, marginBottom: 12 }}><div><span style={{ fontSize: 24, fontWeight: 700, color: "#60a5fa" }}>{wcd[wcd.length - 1]?.weight}</span><span style={{ color: "#64748b", fontSize: 13, marginLeft: 4 }}>lbs</span></div>{wcd.length > 1 && (() => { const df = (wcd[wcd.length - 1].weight - wcd[0].weight).toFixed(1), co = parseFloat(df) <= 0 ? "#22c55e" : "#f59e0b"; return <div><span style={{ fontSize: 24, fontWeight: 700, color: co }}>{parseFloat(df) > 0 ? "+" : ""}{df}</span><span style={{ color: "#64748b", fontSize: 13, marginLeft: 4 }}>lbs</span></div>; })()}</div><ResponsiveContainer width="100%" height={180}><LineChart data={wcd}><XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} /><YAxis domain={["auto", "auto"]} tick={{ fill: "#64748b", fontSize: 10 }} /><Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, color: "#f8fafc" }} /><Line type="monotone" dataKey="weight" stroke="#60a5fa" strokeWidth={2} dot={{ fill: "#60a5fa", r: 3 }} /></LineChart></ResponsiveContainer></div> : <p style={{ color: "#64748b", marginTop: 10 }}>Log weight on Home tab.</p>}</div>
        <div style={{ marginTop: 16 }}><span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>💪 EXERCISE PROGRESSION</span>{WORKOUT_ORDER.map(k => <div key={k}><div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 16, marginBottom: 8 }}><span style={{ fontSize: 14 }}>{WORKOUTS[k].icon}</span><span style={{ color: "#475569", fontSize: 12, fontWeight: 700 }}>{WORKOUTS[k].name}</span></div>{WORKOUTS[k].exercises.map(ex => { const h = geh(ex.id), lm = h.length > 0 ? Math.max(...h[h.length - 1].sets.map(s => parseFloat(s.weight) || 0)) : null; return <button key={ex.id} onClick={() => { setProgressExercise(ex); setView("progress-detail"); }} style={{ ...cS, marginBottom: 6, width: "100%", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, boxSizing: "border-box" }}><div><div style={{ fontWeight: 600, fontSize: 14, color: "#f8fafc" }}>{ex.name}</div><div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{h.length} sessions</div></div><div style={{ textAlign: "right" }}>{lm ? <div style={{ color: "#60a5fa", fontWeight: 700, fontSize: 16 }}>{lm} lb</div> : <div style={{ color: "#334155", fontSize: 13 }}>—</div>}<div style={{ color: "#475569", fontSize: 11 }}>→</div></div></button>; })}</div>)}</div>
      </div>}

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "linear-gradient(180deg, transparent, #0a0f1a 20%)", borderTop: "1px solid #1f2937", display: "flex", justifyContent: "space-around", padding: "8px 0 18px", zIndex: 100 }}>
        {nav.map(i => <button key={i.id} onClick={() => setView(i.id)} style={{ background: "none", border: "none", color: view === i.id || (view === "progress-detail" && i.id === "progress") ? "#3b82f6" : "#475569", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", fontSize: 10, fontWeight: 600, padding: "4px 8px" }}><span style={{ fontSize: 18 }}>{i.icon}</span>{i.label}</button>)}
      </div>
    </div>
  );
}
