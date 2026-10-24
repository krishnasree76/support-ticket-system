import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import TicketForm from '../components/TicketForm';
import { ticketsApi } from '../api/tickets';
import { useAppData } from './AppDataContext';
import { useToast } from './ToastContext';

const TicketFormContext = createContext(null);

// Lets any component open the create/edit ticket modal:
//   const { openCreate, openEdit } = useTicketForm();
export function TicketFormProvider({ children }) {
  const [state, setState] = useState({ open: false, ticket: null });
  const { notifyTicketsChanged } = useAppData();
  const toast = useToast();
  const navigate = useNavigate();

  const openCreate = useCallback(() => setState({ open: true, ticket: null }), []);
  const openEdit = useCallback((ticket) => setState({ open: true, ticket }), []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  const editing = Boolean(state.ticket);

  // Throws on failure so TicketForm can show field errors from the API.
  const handleSubmit = async (values) => {
    if (editing) {
      await ticketsApi.update(state.ticket.id, values);
      toast.success('Ticket updated.');
      notifyTicketsChanged();
      close();
    } else {
      const created = await ticketsApi.create(values);
      toast.success(`Ticket #${created.id} created.`);
      notifyTicketsChanged();
      close();
      navigate(`/tickets/${created.id}`);
    }
  };

  const value = useMemo(() => ({ openCreate, openEdit }), [openCreate, openEdit]);

  return (
    <TicketFormContext.Provider value={value}>
      {children}
      <Modal
        open={state.open}
        onClose={close}
        title={editing ? `Edit ticket #${state.ticket.id}` : 'Create ticket'}
        description={editing ? 'Update the ticket details below.' : 'Describe the issue so the team can pick it up.'}
        size="lg"
      >
        {state.open && (
          <TicketForm
            key={state.ticket?.id ?? 'new'}
            initialTicket={state.ticket}
            onSubmit={handleSubmit}
            onCancel={close}
          />
        )}
      </Modal>
    </TicketFormContext.Provider>
  );
}

export function useTicketForm() {
  const context = useContext(TicketFormContext);
  if (!context) throw new Error('useTicketForm must be used inside TicketFormProvider');
  return context;
}
