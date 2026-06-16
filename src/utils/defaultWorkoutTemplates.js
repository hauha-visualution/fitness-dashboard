export const DEFAULT_WORKOUT_TEMPLATES = [
  {
    name: 'Chest',
    group: 'chest',
    exercises: [
      ['Incline DB Press', 4, 10, '2-0-X-0', '1-2', 90],
      ['Machine Chest Press', 4, 10, '2-0-X-0', '1-2', 90],
      ['Flat DB Press', 3, 10, '2-0-X-0', '1-2', 90],
      ['Cable Fly', 3, 12, '2-1-2-0', '1-2', 75],
      ['Pec Deck Fly', 3, 12, '2-1-2-0', '1-2', 75],
      ['Push-up', 3, 12, '2-0-X-0', '1-2', 60],
    ],
  },
  {
    name: 'Back',
    group: 'back',
    exercises: [
      ['Lat Pulldown', 4, 10, '2-1-X-1', '1-2', 90],
      ['Chest-supported Row', 4, 10, '2-1-X-1', '1-2', 90],
      ['Seated Cable Row', 3, 12, '2-1-X-1', '1-2', 90],
      ['One-arm DB Row', 3, 10, '2-1-X-1', '1-2', 90],
      ['Straight-arm Pulldown', 3, 12, '2-1-2-1', '1-2', 75],
      ['Face Pull', 3, 15, '2-1-2-1', '1-2', 60],
    ],
  },
  {
    name: 'Legs',
    group: 'legs',
    exercises: [
      ['Leg Press', 4, 12, '3-0-X-0', '1-2', 120],
      ['Goblet Squat', 3, 10, '3-0-X-0', '1-2', 90],
      ['Bulgarian Split Squat', 3, 10, '3-0-X-0', '1-2', 90],
      ['Glute Bridge', 3, 12, '2-1-X-1', '1-2', 75],
      ['Leg Curl', 3, 12, '2-1-2-1', '1-2', 75],
      ['Leg Extension', 3, 12, '2-1-2-1', '1-2', 75],
      ['Calf Raise', 4, 15, '2-1-2-1', '1-2', 60],
    ],
  },
  {
    name: 'Shoulders',
    group: 'shoulders',
    exercises: [
      ['DB Shoulder Press', 4, 10, '2-0-X-0', '1-2', 90],
      ['Machine Shoulder Press', 3, 10, '2-0-X-0', '1-2', 90],
      ['Lateral Raise', 4, 15, '2-1-2-1', '1-2', 60],
      ['Cable Lateral Raise', 3, 12, '2-1-2-1', '1-2', 60],
      ['Rear Delt Fly', 3, 15, '2-1-2-1', '1-2', 60],
      ['Face Pull', 3, 15, '2-1-2-1', '1-2', 60],
      ['Cable External Rotation', 2, 15, '2-1-2-1', '2-3', 45],
    ],
  },
  {
    name: 'Arms',
    group: 'arms',
    exercises: [
      ['Cable Triceps Pushdown', 4, 12, '2-1-2-0', '1-2', 60],
      ['Overhead Triceps Extension', 3, 12, '2-1-2-0', '1-2', 60],
      ['DB Curl', 4, 12, '2-1-2-0', '1-2', 60],
      ['Hammer Curl', 3, 12, '2-1-2-0', '1-2', 60],
      ['Preacher Curl', 3, 10, '2-1-2-0', '1-2', 75],
      ['Rope Curl', 3, 12, '2-1-2-0', '1-2', 60],
    ],
  },
  {
    name: 'Core',
    group: 'core',
    exercises: [
      ['Dead Bug', 3, 10, '2-1-2-1', '2-3', 45],
      ['Plank', 3, 45, 'Hold', '2-3', 45],
      ['Side Plank', 3, 30, 'Hold', '2-3', 45],
      ['Pallof Press', 3, 12, '2-1-2-1', '2-3', 45],
      ['Cable Crunch', 3, 12, '2-1-2-1', '1-2', 60],
      ['Bird Dog', 3, 10, '2-1-2-1', '2-3', 45],
    ],
  },
  {
    name: 'Cardio',
    group: 'cardio',
    exercises: [
      ['Incline Walk', 1, 30, 'Zone 2', '3+', 0],
      ['Bike Zone 2', 1, 30, 'Zone 2', '3+', 0],
      ['Row Erg', 4, 4, 'Moderate', '2-3', 90],
      ['Stair Climber', 1, 20, 'Steady', '2-3', 0],
      ['Sled Push', 6, 20, 'Power', '1-2', 90],
      ['Battle Rope Intervals', 8, 20, 'Fast', '1-2', 40],
    ],
  },
  {
    name: 'Recovery',
    group: 'recovery',
    exercises: [
      ['90/90 Breathing', 3, 5, 'Slow', '3+', 30],
      ['Cat-cow', 2, 10, 'Controlled', '3+', 30],
      ['Hip Flexor Stretch', 2, 45, 'Hold', '3+', 30],
      ['Couch Stretch', 2, 45, 'Hold', '3+', 30],
      ['Thoracic Rotation', 2, 10, 'Controlled', '3+', 30],
      ['Hamstring Floss', 2, 12, 'Controlled', '3+', 30],
      ['Dead Hang', 2, 30, 'Hold', '3+', 60],
    ],
  },
  {
    name: 'Other',
    group: 'other',
    exercises: [
      ['Assessment Drill', 2, 10, 'Controlled', '3+', 45],
      ['Mobility Test', 2, 8, 'Controlled', '3+', 45],
      ['Coach Custom Exercise', 3, 10, '2-0-X-0', '1-2', 60],
    ],
  },
];

const buildExerciseRows = (templateId, template) =>
  template.exercises.map(([name, sets, reps, tempo, rir, restSeconds], index) => ({
    template_id: templateId,
    exercise_group: template.group,
    name,
    sets,
    reps,
    weight: 0,
    tempo,
    rir,
    rest_seconds: restSeconds,
    note: null,
    sort_order: index,
  }));

const isDuplicateError = (error) =>
  String(error?.message || '').toLowerCase().includes('duplicate');

export const seedDefaultWorkoutTemplatesForClient = async ({ supabase, coachEmail, clientId }) => {
  if (!supabase || !coachEmail || !clientId) {
    return { created: 0, updated: 0, assigned: 0 };
  }

  const { data: templates, error } = await supabase
    .from('workout_templates')
    .select('id, name, template_exercises(id), template_assignments(client_id)')
    .eq('coach_email', coachEmail);

  if (error) throw error;

  let created = 0;
  let updated = 0;
  let assigned = 0;

  for (const defaultTemplate of DEFAULT_WORKOUT_TEMPLATES) {
    let template = (templates || []).find((item) => {
      const sameName = item.name?.trim().toLowerCase() === defaultTemplate.name.toLowerCase();
      const assignedToClient = (item.template_assignments || []).some((assignment) => assignment.client_id === clientId);
      return sameName && assignedToClient;
    });

    if (!template) {
      const { data: newTemplate, error: createError } = await supabase
        .from('workout_templates')
        .insert({ coach_email: coachEmail, name: defaultTemplate.name })
        .select('id, name, template_exercises(id), template_assignments(client_id)')
        .single();

      if (createError) throw createError;
      template = newTemplate;
      created += 1;
    }

    const alreadyAssigned = (template.template_assignments || []).some((assignment) => assignment.client_id === clientId);
    if (!alreadyAssigned) {
      const { error: assignmentError } = await supabase
        .from('template_assignments')
        .insert({ template_id: template.id, client_id: clientId });

      if (assignmentError && !isDuplicateError(assignmentError)) throw assignmentError;
      assigned += 1;
    }

    if (!template.template_exercises?.length) {
      const { error: exerciseError } = await supabase
        .from('template_exercises')
        .insert(buildExerciseRows(template.id, defaultTemplate));

      if (exerciseError) throw exerciseError;
      updated += 1;
    }
  }

  return { created, updated, assigned };
};
