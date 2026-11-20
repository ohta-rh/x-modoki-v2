import { createPostAction } from '@/features/post-compose/index.server';
import { ComposeDialog, ComposeScreen } from './compose-screens';

type Props = { username: string };

/** /compose/post over the current screen (@modal, #28). */
export function ComposeModal(props: Props) {
  return <ComposeDialog {...props} action={createPostAction} />;
}

/** /compose/post opened directly (#28). */
export function ComposePage(props: Props) {
  return <ComposeScreen {...props} action={createPostAction} />;
}
