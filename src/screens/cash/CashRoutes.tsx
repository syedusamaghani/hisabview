// The cash drawer and expense screens, loaded together only when one of them is opened, so the first screens stay small.
import { CashbookScreen } from './CashbookScreen';
import { CloseDayScreen } from './CloseDayScreen';
import { ExpensesScreen } from './ExpensesScreen';

export default function CashRoutes({ path }: { path: string }) {
  if (path === '/cashbook/close') return <CloseDayScreen />;
  if (path === '/expenses') return <ExpensesScreen />;
  return <CashbookScreen />;
}
