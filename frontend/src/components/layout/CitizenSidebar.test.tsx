import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CitizenSidebar from './CitizenSidebar';
import { useAuthStore } from '../../store/authStore';

const setLoggedIn = (role: any = 'citizen') => useAuthStore.setState({
  user: { _id: '1', name: 'Sita Thapa', email: 's@x.com', role, isActive: true, createdAt: '' },
  token: 't',
  isAuthenticated: true,
});

describe('CitizenSidebar', () => {
  beforeEach(() => { useAuthStore.setState({ user: null, token: null, isAuthenticated: false }); localStorage.clear(); });

  it('renders nothing when the user is not authenticated', () => {
    const { container } = render(
      <MemoryRouter>
        <CitizenSidebar open={true} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the My QueueLess section for citizens', () => {
    setLoggedIn('citizen');
    render(
      <MemoryRouter>
        <CitizenSidebar open={true} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText(/My QueueLess/i)).toBeInTheDocument();
    expect(screen.getByText(/My appointments/i)).toBeInTheDocument();
    expect(screen.getByText(/My tickets/i)).toBeInTheDocument();
    // No admin section
    expect(screen.queryByText(/^Dashboard$/i)).not.toBeInTheDocument();
  });

  it('renders the Admin section for staff users', () => {
    setLoggedIn('org_admin');
    render(
      <MemoryRouter>
        <CitizenSidebar open={true} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText(/^Admin$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Dashboard$/i)).toBeInTheDocument();
    // No citizen section
    expect(screen.queryByText(/^My QueueLess$/i)).not.toBeInTheDocument();
  });

  it('exposes Quick actions and Preferences', () => {
    setLoggedIn('citizen');
    render(
      <MemoryRouter>
        <CitizenSidebar open={true} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Quick actions/i)).toBeInTheDocument();
    expect(screen.getByText(/Book appointment/i)).toBeInTheDocument();
    expect(screen.getByText(/Browse services/i)).toBeInTheDocument();
    expect(screen.getByText(/Preferences/i)).toBeInTheDocument();
  });

  it('calls onClose on the close button and on the backdrop', () => {
    setLoggedIn('citizen');
    let closed = 0;
    const onClose = () => { closed += 1; };
    render(
      <MemoryRouter>
        <CitizenSidebar open={true} onClose={onClose} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByLabelText(/^Close$/i));
    fireEvent.click(screen.getByLabelText(/^Close menu$/i));
    expect(closed).toBe(2);
  });

  it('logs the user out on logout button click', () => {
    setLoggedIn('citizen');
    render(
      <MemoryRouter>
        <CitizenSidebar open={true} onClose={() => {}} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText(/Log out/i));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('shows an inactive state on the drawer when closed prop is false', () => {
    setLoggedIn('citizen');
    render(
      <MemoryRouter>
        <CitizenSidebar open={false} onClose={() => {}} />
      </MemoryRouter>
    );
    const drawer = screen.getByTestId('citizen-sidebar');
    expect(drawer.className).toMatch(/pointer-events-none/);
  });
});
