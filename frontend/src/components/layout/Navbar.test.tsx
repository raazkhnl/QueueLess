import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';
import { useAuthStore } from '../../store/authStore';

const renderNav = () => render(<MemoryRouter><Navbar /></MemoryRouter>);

describe('Navbar', () => {
  beforeEach(() => {
    // Reset auth state between tests
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    localStorage.clear();
  });

  it('shows Login + Sign up when logged out, no avatar trigger', () => {
    renderNav();
    expect(screen.getByTestId('login-link')).toBeInTheDocument();
    expect(screen.getByTestId('signup-link')).toBeInTheDocument();
    expect(screen.queryByTestId('account-menu-trigger')).not.toBeInTheDocument();
  });

  it('always shows public links to Services, Book, and Raise issue', () => {
    renderNav();
    // Anchor against href to be language-agnostic
    expect(screen.getAllByRole('link').filter((a) => a.getAttribute('href') === '/services').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link').filter((a) => a.getAttribute('href') === '/book').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link').filter((a) => a.getAttribute('href') === '/issue/submit').length).toBeGreaterThan(0);
  });

  it('shows avatar trigger and hides login when authenticated', () => {
    useAuthStore.setState({
      user: { _id: '1', name: 'Bikash Tamang', email: 'b@x.com', role: 'citizen', isActive: true, createdAt: '' },
      token: 't',
      isAuthenticated: true,
    });
    renderNav();
    expect(screen.queryByTestId('login-link')).not.toBeInTheDocument();
    expect(screen.queryByTestId('signup-link')).not.toBeInTheDocument();
    expect(screen.getByTestId('account-menu-trigger')).toBeInTheDocument();
  });

  it('shows the user first name on the avatar trigger', () => {
    useAuthStore.setState({
      user: { _id: '1', name: 'Bikash Tamang', email: 'b@x.com', role: 'citizen', isActive: true, createdAt: '' },
      token: 't',
      isAuthenticated: true,
    });
    renderNav();
    const trigger = screen.getByTestId('account-menu-trigger');
    expect(trigger).toHaveTextContent('Bikash');
    expect(trigger).not.toHaveTextContent('Tamang');
  });

  it('opens the citizen drawer when the avatar trigger is clicked', async () => {
    useAuthStore.setState({
      user: { _id: '1', name: 'Bikash Tamang', email: 'b@x.com', role: 'citizen', isActive: true, createdAt: '' },
      token: 't',
      isAuthenticated: true,
    });
    renderNav();
    fireEvent.click(screen.getByTestId('account-menu-trigger'));
    const drawer = await waitFor(() => screen.getByTestId('citizen-sidebar'));
    expect(drawer).toBeInTheDocument();
    // Personal links surface
    expect(screen.getByText(/My appointments/i)).toBeInTheDocument();
    expect(screen.getByText(/My tickets/i)).toBeInTheDocument();
    expect(screen.getByText(/Profile/i)).toBeInTheDocument();
  });
});
