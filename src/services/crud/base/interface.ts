import type { EStatusState } from '@/enums';
import type { IResponses } from '@/interfaces';

/**
 * Represents the state of a CRUD operation.
 * @template T - The type of data being operated on.
 */
interface State<T> {
  isLoading?: boolean;
  status?: EStatusState;
  result?: IResponses<T[]>;
  data?: T;
  isVisible?: boolean;
}
export default State;
