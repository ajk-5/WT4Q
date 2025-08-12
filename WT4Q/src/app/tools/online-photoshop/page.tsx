import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const EditorShell = dynamic(
  () => import('@/app/tools/online-photoshop/components/EditorShell'),
  { ssr: false }
);

export const metadata: Metadata = {
  title: 'Free Online Photoshop',
  description: 'Edit photos in your browser with our free online Photoshop tool.',
  keywords: ['free online photoshop', 'online photo editor', 'web photoshop'],
};

export default async function OnlinePhotoshopPage() {
  const cookieStore = await cookies();
  if (!cookieStore.get('JwtToken')) {
    redirect('/login');
  }
  return <EditorShell />;
}
