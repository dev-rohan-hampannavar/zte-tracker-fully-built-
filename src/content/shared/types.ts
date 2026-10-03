// Structured content model for the shared-workspace playbooks. Content is
// plain data so it can be tested (no owner references, no empty sections) and
// rendered by one generic component.

export interface PlaybookItem {
  heading: string;
  body?: string;
  bullets?: string[];
  example?: string;
}

export interface PlaybookBlock {
  title: string;
  intro?: string;
  items?: PlaybookItem[];
  steps?: string[];
  table?: { headers: string[]; rows: string[][] };
  callout?: string;
}

export interface PlaybookSection {
  id: string;
  label: string;
  summary: string;
  blocks: PlaybookBlock[];
}

export interface Playbook {
  title: string;
  subtitle: string;
  sections: PlaybookSection[];
}
