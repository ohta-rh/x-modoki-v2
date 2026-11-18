'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import type { ProfileInput } from '../model/schema';
import type { UpdateProfileActionResult } from '../model/types';

type Props = {
  initial: ProfileInput;
  action: (input: ProfileInput) => Promise<UpdateProfileActionResult>;
  onSaved: () => void;
};

const FIELDS: { name: keyof ProfileInput; label: string; multiline?: boolean }[] = [
  { name: 'name', label: '名前' },
  { name: 'bio', label: '自己紹介', multiline: true },
  { name: 'location', label: '場所' },
  { name: 'website', label: 'ウェブサイト' },
];

/** The profile editor (#23): name, bio, location and link, with errors per field. */
export function ProfileEditForm({ initial, action, onSaved }: Props) {
  const [result, setResult] = useState<UpdateProfileActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const failed = result?.ok === false ? result : null;
  return (
    <form
      className="flex flex-col gap-5 px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const input = Object.fromEntries(
          FIELDS.map(({ name }) => [name, String(data.get(name))]),
        ) as ProfileInput;
        startTransition(async () => {
          const next = await action(input);
          setResult(next);
          if (next.ok) onSaved();
        });
      }}
    >
      {FIELDS.map((field) => (
        <Field
          key={field.name}
          name={field.name}
          label={field.label}
          multiline={field.multiline}
          defaultValue={initial[field.name]}
          errors={failed?.fieldErrors[field.name]}
        />
      ))}
      {failed?.message ? (
        <p role="alert" className="text-danger">
          {failed.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="self-end">
        保存
      </Button>
    </form>
  );
}
