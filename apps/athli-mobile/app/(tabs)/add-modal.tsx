import { Redirect } from 'expo-router';

// This screen is only used as a placeholder for NativeTabs layout
// The actual modal is opened via the overlay button which navigates to add-modal-content
export default function AddModal() {
  // Redirect back to clients tab (this should never be visible due to overlay)
  return <Redirect href="/clients" />;
}




