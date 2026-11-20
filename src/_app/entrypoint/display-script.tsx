import { DISPLAY_SCRIPT } from '@/shared/config';

/** The head script that sets the saved theme and accent before the first paint (ADR-0051). */
export function DisplayScript() {
  return <script dangerouslySetInnerHTML={{ __html: DISPLAY_SCRIPT }} />;
}
