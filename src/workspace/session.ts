import { useAuth } from '../App';

/** The signed-in user and the role they are acting as (ProductManager or Employee, as in the JWT). */
export function useMe() {
  const { user } = useAuth();
  return { user, userId: user?.userId ?? 0, name: user?.name ?? '', isPM: user?.userType === 'ProductManager' };
}
