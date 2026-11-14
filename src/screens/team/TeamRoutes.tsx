// Staff work, the activity feed and the alerts, loaded together only when one of them is opened.
import { ActivityScreen } from './ActivityScreen';
import { AlertsScreen } from './AlertsScreen';
import { TeamScreen } from './TeamScreen';

export default function TeamRoutes({ path }: { path: string }) {
  if (path === '/activity') return <ActivityScreen />;
  if (path === '/alerts') return <AlertsScreen />;
  return <TeamScreen />;
}
