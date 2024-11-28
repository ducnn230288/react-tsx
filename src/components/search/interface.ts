/**
 * @param {string} props.value - The pagination query parameters.
 * @param {Function} props.handleTableChange - The function to handle table changes.
 */
interface Props {
  value?: string;
  onChange: (value?: string) => void;
}
export default Props;
