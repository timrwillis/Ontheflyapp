/**
 * Single source of truth for worker/shift roles.
 * Used by:
 *   - app/onboarding/worker/roles.tsx  (worker role selection)
 *   - app/create-shift.tsx             (manager shift blast)
 * Keys match the Postgres worker_role enum exactly.
 */
export const ROLES = [
  { key: 'bartender',   label: 'Bartender',      lib: 'mci',      icon: 'glass-cocktail'        },
  { key: 'server',      label: 'Server',          lib: 'mci',      icon: 'silverware-fork-knife' },
  { key: 'cook',        label: 'Cook',            lib: 'mci',      icon: 'chef-hat'              },
  { key: 'busser',      label: 'Busser',          lib: 'mci',      icon: 'bowl-mix-outline'      },
  { key: 'barback',     label: 'Barback',         lib: 'mci',      icon: 'bottle-wine'           },
  { key: 'event_staff', label: 'Event Staff',     lib: 'ionicons', icon: 'people-outline'        },
  { key: 'security',    label: 'Security',        lib: 'ionicons', icon: 'shield-outline'        },
  { key: 'host',        label: 'Host / Hostess',  lib: 'feather',  icon: 'home'                  },
  { key: 'runner',      label: 'Runner',          lib: 'mci',      icon: 'run-fast'              },
  { key: 'line_cook',   label: 'Line Cook',       lib: 'mci',      icon: 'pot-steam-outline'     },
  { key: 'dishwasher',  label: 'Dishwasher',      lib: 'mci',      icon: 'dishwasher'            },
  { key: 'catering',    label: 'Catering',        lib: 'mci',      icon: 'silverware-variant'    },
] as const;

export type RoleKey = typeof ROLES[number]['key'];
