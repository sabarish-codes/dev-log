import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '../pages/Login';
import { RegisterPage } from '../pages/Register';
import { loginApi, registerApi } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../api/auth', () => ({
  loginApi: vi.fn(),
  registerApi: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Auth Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearAuth();
  });

  describe('LoginPage', () => {
    it('submits credentials, stores auth, and navigates to /logs', async () => {
      vi.mocked(loginApi).mockResolvedValueOnce({
        user: {
          id: 1,
          username: 'alice',
          email: 'alice@test.dev',
          createdAt: '2026-11-01T00:00:00Z',
        },
        accessToken: 'jwt-token',
      });

      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'alice@test.dev' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'Password123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(loginApi).toHaveBeenCalledWith({
          email: 'alice@test.dev',
          password: 'Password123!',
        });
      });

      expect(useAuthStore.getState().accessToken).toBe('jwt-token');
      expect(mockNavigate).toHaveBeenCalledWith('/logs');
    });

    it('shows API error message via toast when login fails', async () => {
      vi.mocked(loginApi).mockRejectedValueOnce({
        response: { data: { error: { message: 'Invalid email or password' } } },
      });

      render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'alice@test.dev' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpass' },
      });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Invalid email or password');
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('RegisterPage', () => {
    it('validates minimum password length client-side before calling API', async () => {
      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: 'alice' },
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'alice@test.dev' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'short' },
      });
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      expect(toast.error).toHaveBeenCalledWith(
        'Password must be at least 8 characters long',
      );
      expect(registerApi).not.toHaveBeenCalled();
    });

    it('shows API error when registration fails (e.g. duplicate email)', async () => {
      vi.mocked(registerApi).mockRejectedValueOnce({
        response: { data: { error: { message: 'Email already registered' } } },
      });

      render(
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: 'alice' },
      });
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'alice@test.dev' },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'Password123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Email already registered');
      });
    });
  });
});
