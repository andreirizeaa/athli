import { useCoachPreferences } from '@/stores';

export type ClientTerminology = 'athlete' | 'client' | 'member';

interface TerminologyLabels {
  // Singular forms
  singular: string;           // "Athlete" / "Client" / "Member"
  singularLower: string;      // "athlete" / "client" / "member"

  // Plural forms
  plural: string;             // "Athletes" / "Clients" / "Members"
  pluralLower: string;        // "athletes" / "clients" / "members"

  // Common actions
  addSingular: string;        // "Add Athlete" / "Add Client" / "Add Member"
  assignToSingular: string;   // "Assign to athlete" / "Assign to client" / "Assign to member"
  assignToPlural: string;     // "Assign to athletes" / "Assign to clients" / "Assign to members"
  searchPlural: string;       // "Search athletes..." / "Search clients..." / "Search members..."
  noPluralFound: string;      // "No athletes found" / "No clients found" / "No members found"
  noPluralYet: string;        // "No athletes yet" / "No clients yet" / "No members yet"
  selectSingular: string;     // "Select athlete" / "Select client" / "Select member"
  selectPlural: string;       // "Select Athletes" / "Select Clients" / "Select Members"
  allPlural: string;          // "All Athletes" / "All Clients" / "All Members"
  selectedPlural: string;     // "Selected Athletes" / "Selected Clients" / "Selected Members"
  atRiskTitle: string;        // "At Risk Athletes" / "At Risk Clients" / "At Risk Members"
  atRiskMessage: string;      // "Athletes shown here..." / "Clients shown here..." / "Members shown here..."

  // Count helpers
  countLabel: (count: number) => string;  // "1 athlete" / "5 athletes" etc.
  assignToCountLabel: (count: number) => string;  // "Assign to 1 athlete" / "Assign to 5 athletes" etc.
}

const terminologyMap: Record<ClientTerminology, TerminologyLabels> = {
  athlete: {
    singular: 'Athlete',
    singularLower: 'athlete',
    plural: 'Athletes',
    pluralLower: 'athletes',
    addSingular: 'Add Athlete',
    assignToSingular: 'Assign to athlete',
    assignToPlural: 'Assign to Athletes',
    searchPlural: 'Search athletes...',
    noPluralFound: 'No athletes found',
    noPluralYet: 'No athletes yet',
    selectSingular: 'Select athlete',
    selectPlural: 'Select Athletes',
    allPlural: 'All Athletes',
    selectedPlural: 'Selected Athletes',
    atRiskTitle: 'At Risk Athletes',
    atRiskMessage: 'Athletes shown here have not logged any training activity for an extended period.',
    countLabel: (count: number) => count === 1 ? '1 athlete' : `${count} athletes`,
    assignToCountLabel: (count: number) => count === 1 ? 'Assign to 1 athlete' : `Assign to ${count} athletes`,
  },
  client: {
    singular: 'Client',
    singularLower: 'client',
    plural: 'Clients',
    pluralLower: 'clients',
    addSingular: 'Add Client',
    assignToSingular: 'Assign to client',
    assignToPlural: 'Assign to Clients',
    searchPlural: 'Search clients...',
    noPluralFound: 'No clients found',
    noPluralYet: 'No clients yet',
    selectSingular: 'Select client',
    selectPlural: 'Select Clients',
    allPlural: 'All Clients',
    selectedPlural: 'Selected Clients',
    atRiskTitle: 'At Risk Clients',
    atRiskMessage: 'Clients shown here have not logged any training activity for an extended period.',
    countLabel: (count: number) => count === 1 ? '1 client' : `${count} clients`,
    assignToCountLabel: (count: number) => count === 1 ? 'Assign to 1 client' : `Assign to ${count} clients`,
  },
  member: {
    singular: 'Member',
    singularLower: 'member',
    plural: 'Members',
    pluralLower: 'members',
    addSingular: 'Add Member',
    assignToSingular: 'Assign to member',
    assignToPlural: 'Assign to Members',
    searchPlural: 'Search members...',
    noPluralFound: 'No members found',
    noPluralYet: 'No members yet',
    selectSingular: 'Select member',
    selectPlural: 'Select Members',
    allPlural: 'All Members',
    selectedPlural: 'Selected Members',
    atRiskTitle: 'At Risk Members',
    atRiskMessage: 'Members shown here have not logged any training activity for an extended period.',
    countLabel: (count: number) => count === 1 ? '1 member' : `${count} members`,
    assignToCountLabel: (count: number) => count === 1 ? 'Assign to 1 member' : `Assign to ${count} members`,
  },
};

/**
 * Hook to get terminology labels based on coach's client_terminology preference.
 * Returns labels for "athlete", "client", or "member" terminology.
 */
export function useTerminology(): TerminologyLabels {
  const { terminology } = useCoachPreferences();

  return terminologyMap[terminology as ClientTerminology] || terminologyMap.athlete;
}

/**
 * Get terminology labels without React hook (for use outside components).
 * Defaults to 'athlete' if no terminology is provided.
 */
export function getTerminologyLabels(terminology: ClientTerminology = 'athlete'): TerminologyLabels {
  return terminologyMap[terminology] || terminologyMap.athlete;
}
