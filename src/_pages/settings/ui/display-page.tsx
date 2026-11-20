import { DisplaySettings } from '@/features/display-settings';
import { setDisplayAction } from '@/features/display-settings/index.server';
import type { Accent, Theme } from '@/shared/config';
import { PageHeader } from '@/widgets/app-shell';

/** /settings/display (#29): the theme and accent colour. */
export function DisplayPage({ theme, accent }: { theme: Theme; accent: Accent }) {
  return (
    <>
      <PageHeader title="表示" />
      <DisplaySettings theme={theme} accent={accent} action={setDisplayAction} />
    </>
  );
}
