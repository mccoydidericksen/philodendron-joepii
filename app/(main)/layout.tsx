import { BottomTabBar } from '@/components/navigation/BottomTabBar';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <BottomTabBar />
    </>
  );
}
