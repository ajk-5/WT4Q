"use client";
import { usePathname } from 'next/navigation';
import PageVisitLogger from './PageVisitLogger';

export default function PageVisitReporter() {
  const path = usePathname();
  return <PageVisitLogger page={path} />;
}
