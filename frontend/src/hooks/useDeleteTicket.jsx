import { useState } from 'react';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { ticketsApi } from '../api/tickets';
import { getErrorMessage } from '../api/client';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';

// Delete-with-confirmation flow shared by the list and details pages.
// Usage: const { requestDelete, dialog } = useDeleteTicket(onDeleted); render {dialog}.
export function useDeleteTicket(onDeleted) {
  const [ticket, setTicket] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { notifyTicketsChanged } = useAppData();
  const toast = useToast();

  const confirm = async () => {
    setDeleting(true);
    try {
      await ticketsApi.remove(ticket.id);
      toast.success(`Ticket #${ticket.id} deleted.`);
      setTicket(null);
      onDeleted?.(ticket);
      notifyTicketsChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const dialog = (
    <ConfirmationDialog
      open={Boolean(ticket)}
      title="Delete ticket?"
      message={
        ticket
          ? `"${ticket.title}" (#${ticket.id}) and its full activity history will be permanently deleted. This cannot be undone.`
          : ''
      }
      confirmLabel="Delete ticket"
      loading={deleting}
      onConfirm={confirm}
      onCancel={() => setTicket(null)}
    />
  );

  return { requestDelete: setTicket, dialog };
}
