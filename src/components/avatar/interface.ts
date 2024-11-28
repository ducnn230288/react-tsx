/**
 * Represents the properties for the Avatar component.
 */
interface Props {
  src: string;
  text?: string | { [selector: string]: string }[];
  size?: number;
  showName?: boolean;
  index?: number;
}
export default Props;
/**
 * Represents an object of type TypeObject.
 */
export interface PropsObject extends Props {
  keySrc?: string;
  keyName?: string;
  maxCount?: number;
}
