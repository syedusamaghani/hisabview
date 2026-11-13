// The business dashboard and the profit screen, loaded together only when one of them is opened.
import { DashboardScreen } from './DashboardScreen';
import { ProfitScreen } from './ProfitScreen';

export default function ReportRoutes({ path }: { path: string }) {
  return path === '/profit' ? <ProfitScreen /> : <DashboardScreen />;
}
