
import React from 'react';

export type SectionTopic = 'forces' | 'faiblesses' | 'propositions';
export type DocumentId = 'sphinx' | 'echo-pediatrie';

export interface DocumentData {
  id: DocumentId;
  title: string;
  subtitle: string;
  sections: {
    forces: { title: string; content: React.ReactNode; rawText: string };
    faiblesses: { title: string; content: React.ReactNode; rawText: string };
    propositions: { title: string; content: React.ReactNode; rawText: string };
  };
  originalRef: React.ReactNode;
}
