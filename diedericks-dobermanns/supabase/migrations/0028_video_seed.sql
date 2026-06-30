-- 0028 — Video placeholders for training library

DO $$
DECLARE
  cat_obedience  uuid;
  cat_protection uuid;
  cat_social     uuid;
  cat_curriculum uuid;
  bundle_protection uuid;
  bundle_curriculum uuid;
BEGIN
  SELECT id INTO cat_obedience  FROM training_video_categories WHERE name = 'Foundation Obedience' LIMIT 1;
  SELECT id INTO cat_protection FROM training_video_categories WHERE name = 'Protection Work' LIMIT 1;
  SELECT id INTO cat_social     FROM training_video_categories WHERE name = 'Socialisation & Environments' LIMIT 1;
  SELECT id INTO cat_curriculum FROM training_video_categories WHERE name = 'Puppy Curriculum' LIMIT 1;
  SELECT id INTO bundle_protection FROM video_bundles WHERE name LIKE 'Protection%' LIMIT 1;
  SELECT id INTO bundle_curriculum FROM video_bundles WHERE name LIKE 'Complete%' LIMIT 1;

  INSERT INTO training_videos (category_id, title, description, access_tier, sort_order, tags) VALUES
    (cat_obedience, 'The Sit — Foundation', 'Teaching a reliable sit using food luring and marker training. We build duration, distance, and position before adding the formal verbal cue.', 'free', 1, ARRAY['obedience','sit','foundation','beginner']),
    (cat_obedience, 'The Down — Foundation', 'Shaping a fast, confident down from both standing and sitting positions. Critical for IGP obedience and everyday control.', 'free', 2, ARRAY['obedience','down','foundation','beginner']),
    (cat_obedience, 'The Stand — Foundation', 'Teaching the stand position — often overlooked but essential for IGP obedience routines and health examinations.', 'free', 3, ARRAY['obedience','stand','foundation','beginner']),
    (cat_obedience, 'Recall Phase 1 — Building the Come', 'The recall is the single most important command. Phase 1 establishes the conditioned response using a strong reinforcement history. No corrections — pure drive.', 'free', 4, ARRAY['obedience','recall','foundation','beginner']),
    (cat_obedience, 'Recall Phase 2 — Distance & Distraction', 'Extending recall reliability to 30+ metres with mild environmental distractions. Building the habit of an immediate, enthusiastic response.', 'free', 5, ARRAY['obedience','recall','intermediate']),
    (cat_obedience, 'Recall Phase 3 — Off-Leash Reliability', 'Off-leash recall in varied environments. We introduce the formal front position and the finish (heel) for competition preparation.', 'free', 6, ARRAY['obedience','recall','off-leash','intermediate']),
    (cat_obedience, 'Recall Phase 4 — Competition Level Recall', 'The full IGP obedience recall pattern: call from the down position, straight front, finish to heel. Precision and drive simultaneously.', 'free', 7, ARRAY['obedience','recall','competition','advanced']);

  INSERT INTO training_videos (category_id, bundle_id, title, description, access_tier, sort_order, tags) VALUES
    (cat_protection, bundle_protection, 'Protection Phase 1 — Drive Building & Tug Foundation', 'Before the helper ever enters the picture, the dog must have an unshakeable tug drive. We build prey drive, grip quality, and the out command through structured tug sessions.', 'bundle', 1, ARRAY['protection','drive','tug','foundation']),
    (cat_protection, bundle_protection, 'Protection Phase 2 — Introducing the Helper', 'First contact with the decoy. Controlled civil agitation, equipment introduction, and the first helper-driven grip. Creating positive associations with protection work.', 'bundle', 2, ARRAY['protection','helper','decoy','intermediate']),
    (cat_protection, bundle_protection, 'Protection Phase 3 — Bark & Hold Foundation', 'The bark exercise is the foundation of all IGP protection. Teaching the dog to guard a stationary helper with sustained, powerful barking — no grip until commanded.', 'bundle', 3, ARRAY['protection','bark','hold','intermediate']),
    (cat_protection, bundle_protection, 'Protection Phase 4 — Defence Drive Development', 'Transitioning from pure prey into civil defense drive. The helper applies controlled pressure. Building courage, hardness, and full grips under stress.', 'bundle', 4, ARRAY['protection','defence','drive','advanced']),
    (cat_protection, bundle_protection, 'Protection Phase 5 — Full Pattern & Trial Preparation', 'The complete IGP protection routine: search blind, escape bite, courage test, transport, and guard. Precision, drive, and control in competition format.', 'bundle', 5, ARRAY['protection','competition','igp','advanced']);

  INSERT INTO training_videos (category_id, title, description, access_tier, sort_order, tags) VALUES
    (cat_social, 'Socialisation — People, Children & Crowds', 'The critical window (8–16 weeks) for positive human exposure. Correct greet manners, managing excitement, and building stable temperament around all types of people.', 'free', 1, ARRAY['socialisation','people','temperament','puppy']),
    (cat_social, 'Environmental Exposure — Urban Noise & Traffic', 'Systematic desensitisation to vehicles, traffic sounds, sirens, and urban environments. The goal: complete indifference — not tolerance.', 'free', 2, ARRAY['socialisation','environment','noise','desensitisation']),
    (cat_social, 'Environmental Exposure — Surfaces, Heights & Objects', 'Building physical and mental confidence on different surfaces (grates, water, sand, gravel), at heights, and around novel objects. Lays the foundation for IGP agility.', 'free', 3, ARRAY['socialisation','environment','confidence','surfaces']),
    (cat_social, 'Dog-to-Dog Socialisation', 'Controlled exposure to other dogs — reading body language, preventing reactivity, and developing appropriate social skills without creating prey drive conflicts.', 'free', 4, ARRAY['socialisation','dogs','body-language','beginner']),
    (cat_social, 'Confidence Building — Novel Environments', 'Taking your Dobermann to new places: parks, shopping centres, farms, rivers. How to manage the outing to build confidence, not anxiety.', 'free', 5, ARRAY['socialisation','environment','confidence','outings']);

  INSERT INTO training_videos (category_id, bundle_id, title, description, access_tier, sort_order, week_label, tags) VALUES
    (cat_curriculum, bundle_curriculum, 'Week 8–10: Arrival & First Days', 'Setting your puppy up for success from day one. Crate introduction, name conditioning, first leash contact, and establishing the handler as the source of all good things.', 'bundle', 1, 'Week 8–10', ARRAY['curriculum','foundation','puppy','week8']),
    (cat_curriculum, bundle_curriculum, 'Week 10–12: Drive Activation & Play', 'Identifying and building your puppy''s strongest drive (prey, food, play). Tug introduction, structured play sessions, and the first conditioned marker (Yes/clicker).', 'bundle', 2, 'Week 10–12', ARRAY['curriculum','drive','tug','play','week10']),
    (cat_curriculum, bundle_curriculum, 'Week 12–14: Sit, Down, Stand — Food Luring', 'Teaching the three core positions through pure food luring. Short sessions (3 min), high rate of reinforcement, building the habit of success before formalising cues.', 'bundle', 3, 'Week 12–14', ARRAY['curriculum','obedience','sit','down','stand','week12']),
    (cat_curriculum, bundle_curriculum, 'Week 14–16: Recall Foundation & First Tracking', 'Conditioning the recall cue with maximum reinforcement. Introduction to nose work — following food tracks on short grass. Building drive to the ground.', 'bundle', 4, 'Week 14–16', ARRAY['curriculum','recall','tracking','nose-work','week14']),
    (cat_curriculum, bundle_curriculum, 'Week 16–20: Formalising Commands & Leash Manners', 'Transitioning from luring to handler body language cues. Introducing the formal heel position (not competition heel yet), basic leash pressure, and first sustained positions (10 seconds).', 'bundle', 5, 'Week 16–20', ARRAY['curriculum','heel','leash','obedience','week16']),
    (cat_curriculum, bundle_curriculum, 'Week 20–24: Building Duration & Distraction', 'Sit-stay and down-stay to 1 minute with handler at heel. Introduction to mild distractions (toys, food on ground). Recall from distance (15m). Short tracking articles.', 'bundle', 6, 'Week 20–24', ARRAY['curriculum','duration','distraction','stay','week20']),
    (cat_curriculum, bundle_curriculum, 'Week 24–28: Drive Regulation — On/Off Switch', 'Teaching the dog to transition rapidly between high drive and calm. The foundation of IGP obedience — precision requires control over arousal. Structured out on the tug.', 'bundle', 7, 'Week 24–28', ARRAY['curriculum','drive','control','arousal','week24']),
    (cat_curriculum, bundle_curriculum, 'Week 28–32: Retrieve Foundation & Jumping', 'Introducing the formal retrieve (hold, front, finish). Low jump introduction — building enthusiasm and confidence for agility obstacles. Article tracking on aged tracks.', 'bundle', 8, 'Week 28–32', ARRAY['curriculum','retrieve','jumping','tracking','week28']),
    (cat_curriculum, bundle_curriculum, 'Week 32–36: Off-Leash Obedience & Group Work', 'First sustained off-leash sessions. Group work — dog working calmly among neutral dogs. Drop on recall. Stand for exam. Building reliability under social pressure.', 'bundle', 9, 'Week 32–36', ARRAY['curriculum','off-leash','group','reliability','week32']),
    (cat_curriculum, bundle_curriculum, 'Week 36–40: Protection Foundations — Helper Introduction', 'If temperament evaluation is passed: controlled helper introduction, drive building on equipment, first civil agitation. Criteria: solid grip, full commitment, fast out.', 'bundle', 10, 'Week 36–40', ARRAY['curriculum','protection','helper','foundations','week36']),
    (cat_curriculum, bundle_curriculum, 'Week 40–44: Bark Exercise & Sustained Control', 'The bark and hold exercise in protection. Simultaneously: obedience under distraction near the helper. Dog must be fully dual-tracked — working both drives cleanly.', 'bundle', 11, 'Week 40–44', ARRAY['curriculum','bark','hold','protection','week40']),
    (cat_curriculum, bundle_curriculum, 'Week 44–48: Full Routine Integration', 'Assembling all components into the IGP/BH routine structure. Tracking, obedience, and protection worked in sequence. Building mental stamina for 2-hour trial days.', 'bundle', 12, 'Week 44–48', ARRAY['curriculum','integration','routine','trial','week44']),
    (cat_curriculum, bundle_curriculum, 'Week 48–52: BH Evaluation Preparation', 'BH/VT readiness: full heeling pattern, group, traffic test, neutrality test. Protection: courage test preparation. Final temperament and control evaluation before trial entry.', 'bundle', 13, 'Week 48–52', ARRAY['curriculum','bh','evaluation','trial','week48']);

END $$;
