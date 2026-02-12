'use client';

import { useGlobalData } from '@/providers/global-data-provider';

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
  singleSingular: string;     // "Single athlete" / "Single client" / "Single member"
  uploadPlural: string;       // "Upload athletes" / "Upload clients" / "Upload members"
  assignToSingular: string;   // "Assign to athlete" / "Assign to client" / "Assign to member"
  assignToPlural: string;     // "Assign to athletes" / "Assign to clients" / "Assign to members"
  addToPlural: string;        // "Add to athletes" / "Add to clients" / "Add to members"
  searchPlural: string;       // "Search athletes..." / "Search clients..." / "Search members..."
  noPluralFound: string;      // "No athletes found." / "No clients found." / "No members found."
  selectSingular: string;     // "Select Athlete" / "Select Client" / "Select Member"
  restoreArchived: string;    // "Restore archived athletes" / "Restore archived clients" / "Restore archived members"
  invitePlural: string;       // "Invite your athletes" / "Invite your clients" / "Invite your members"
  managePlural: string;       // "Manage all of your athletes..." / "Manage all of your clients..." / etc.
  broadcastDescription: string; // "Send messages to multiple athletes at once..."

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
    singleSingular: 'Single athlete',
    uploadPlural: 'Upload athletes',
    assignToSingular: 'Assign to athlete',
    assignToPlural: 'Assign to athletes',
    addToPlural: 'Add to athletes',
    searchPlural: 'Search athletes...',
    noPluralFound: 'No athletes found.',
    selectSingular: 'Select Athlete',
    restoreArchived: 'Restore archived athletes',
    invitePlural: 'Invite your athletes',
    managePlural: 'Manage all of your athletes through Athli',
    broadcastDescription: 'Send messages to multiple athletes at once. Available on the Max plan.',
    countLabel: (count: number) => count === 1 ? '1 athlete' : `${count} athletes`,
    assignToCountLabel: (count: number) => count === 1 ? 'Assign to 1 athlete' : `Assign to ${count} athletes`,
  },
  client: {
    singular: 'Client',
    singularLower: 'client',
    plural: 'Clients',
    pluralLower: 'clients',
    addSingular: 'Add Client',
    singleSingular: 'Single client',
    uploadPlural: 'Upload clients',
    assignToSingular: 'Assign to client',
    assignToPlural: 'Assign to clients',
    addToPlural: 'Add to clients',
    searchPlural: 'Search clients...',
    noPluralFound: 'No clients found.',
    selectSingular: 'Select Client',
    restoreArchived: 'Restore archived clients',
    invitePlural: 'Invite your clients',
    managePlural: 'Manage all of your clients through Athli',
    broadcastDescription: 'Send messages to multiple clients at once. Available on the Max plan.',
    countLabel: (count: number) => count === 1 ? '1 client' : `${count} clients`,
    assignToCountLabel: (count: number) => count === 1 ? 'Assign to 1 client' : `Assign to ${count} clients`,
  },
  member: {
    singular: 'Member',
    singularLower: 'member',
    plural: 'Members',
    pluralLower: 'members',
    addSingular: 'Add Member',
    singleSingular: 'Single member',
    uploadPlural: 'Upload members',
    assignToSingular: 'Assign to member',
    assignToPlural: 'Assign to members',
    addToPlural: 'Add to members',
    searchPlural: 'Search members...',
    noPluralFound: 'No members found.',
    selectSingular: 'Select Member',
    restoreArchived: 'Restore archived members',
    invitePlural: 'Invite your members',
    managePlural: 'Manage all of your members through Athli',
    broadcastDescription: 'Send messages to multiple members at once. Available on the Max plan.',
    countLabel: (count: number) => count === 1 ? '1 member' : `${count} members`,
    assignToCountLabel: (count: number) => count === 1 ? 'Assign to 1 member' : `Assign to ${count} members`,
  },
};

/**
 * Hook to get terminology labels based on coach's client_terminology preference.
 * Returns labels for "athlete", "client", or "member" terminology.
 */
export function useTerminology(): TerminologyLabels {
  const { preferences } = useGlobalData();
  const terminology = preferences?.client_terminology || 'athlete';

  return terminologyMap[terminology as ClientTerminology] || terminologyMap.athlete;
}

/**
 * Get terminology labels without React hook (for use outside components).
 * Defaults to 'athlete' if no terminology is provided.
 */
export function getTerminologyLabels(terminology: ClientTerminology = 'athlete'): TerminologyLabels {
  return terminologyMap[terminology] || terminologyMap.athlete;
}
