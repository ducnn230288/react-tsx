import { EStatusState } from '@/enums';
import type State from './base/interface';
import type StateType from './type/interface';

/**
 * Represents the state for CRUD operations with additional properties.
 *
 * @template T - The type of the object being manipulated.
 */
export interface StateCrud<T = object, Y = object> extends State<T>, StateType<Y> {}

/**
 * Initial state for the CRUD service.
 */
export const initialState: StateCrud = {
  result: undefined,
  data: undefined,
  isLoading: false,
  isVisible: false,
  status: EStatusState.Idle,

  resultType: undefined,
  dataType: undefined,
  isLoadingType: false,
  isVisibleType: false,
  statusType: EStatusState.Idle,
};
