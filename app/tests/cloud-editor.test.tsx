// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { CloudStudio } from '../src/cloud/CloudStudio';
import { newProject } from '../src/state/project';
import type { HumlineProject } from '../src/types/project';
import type { CloudMelody } from '../src/cloud/model';

const { api, signOut } = vi.hoisted(() => ({ api: vi.fn(), signOut: vi.fn() }));
vi.mock('@clerk/react', () => ({
  useAuth: () => ({ userId: 'alice' }),
  useClerk: () => ({ signOut }),
}));
vi.mock('../src/cloud/client', async (original) => ({
  ...(await original<typeof import('../src/cloud/client')>()),
  useApi: () => api,
}));
// The studio is tested separately in Chromium. This harness drives its actual cloud wrapper.
vi.mock('../src/App', () => ({
  default: ({
    initialProject,
    onProjectChange,
    cloudToolbar,
  }: {
    initialProject: HumlineProject;
    onProjectChange: (p: HumlineProject) => void;
    cloudToolbar: import('react').ReactNode;
  }) => (
    <>
      {cloudToolbar}
      <input
        aria-label="Test melody title"
        defaultValue={initialProject.title}
        onChange={(e) => onProjectChange({ ...initialProject, title: e.target.value })}
      />
    </>
  ),
}));
beforeEach(() => {
  localStorage.clear();
  api.mockReset();
  signOut.mockReset();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
});
afterEach(cleanup);
function mount(id = 'new') {
  const router = createMemoryRouter(
    [
      { path: '/studio/:id', element: <CloudStudio /> },
      { path: '/melodies', element: <p>Library destination</p> },
    ],
    { initialEntries: [`/studio/${id}`] },
  );
  render(<RouterProvider router={router} />);
  return router;
}
async function title(value: string) {
  fireEvent.change(await screen.findByLabelText('Test melody title'), { target: { value } });
}
function result(project = newProject(), revision = 1): CloudMelody {
  return {
    id: 'e81e79a4-5ce9-41c0-a123-e0f58d23f557',
    project,
    revision,
    updatedAt: new Date().toISOString(),
  };
}
it('retains edits after a failed save and only reports saved after acknowledgment', async () => {
  api.mockRejectedValueOnce(new Error('Offline'));
  mount();
  await title('Keep this idea');
  fireEvent.click(screen.getByRole('button', { name: 'Save melody' }));
  await screen.findByText('Offline Your edits are still here.');
  expect((screen.getByLabelText('Test melody title') as HTMLInputElement).value).toBe(
    'Keep this idea',
  );
  expect(localStorage.getItem('humline.draft.v1:alice:new')).toContain('Keep this idea');
  api.mockResolvedValueOnce(result());
  fireEvent.click(screen.getByRole('button', { name: 'Save melody' }));
  await screen.findByText('Saved to your library');
  expect(JSON.parse(api.mock.calls[1][1].body).project.title).toBe('Keep this idea');
});
it('blocks navigation and does not leave when Save and leave fails', async () => {
  api.mockRejectedValueOnce(new Error('Offline'));
  const router = mount();
  await title('Unsent idea');
  fireEvent.click(screen.getByRole('link', { name: '← My melodies' }));
  await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('button', { name: 'Save and leave' }));
  await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
  expect(router.state.location.pathname).toBe('/studio/new');
  await waitFor(() => expect(screen.getAllByText(/Offline/).length).toBeGreaterThan(0));
  fireEvent.click(screen.getByRole('button', { name: 'Discard and leave' }));
  await screen.findByText('Library destination');
  expect(localStorage.getItem('humline.draft.v1:alice:new')).toBeNull();
});
it('a save response cannot mark edits made during the request as saved', async () => {
  let resolve!: (value: CloudMelody) => void;
  api.mockImplementationOnce(
    () =>
      new Promise<CloudMelody>((done) => {
        resolve = done;
      }),
  );
  mount();
  await title('Version one');
  fireEvent.click(screen.getByRole('button', { name: 'Save melody' }));
  await title('Version two');
  await act(async () => resolve(result()));
  expect(screen.getByText('Unsaved changes')).toBeTruthy();
  expect(screen.queryByText('Saved to your library')).toBeNull();
});
it('new-page refresh remembers the server identity instead of creating a duplicate', async () => {
  const saved = result();
  localStorage.setItem(
    'humline.draft.v1:alice:new',
    JSON.stringify({ project: saved.project, remoteId: saved.id, revision: saved.revision }),
  );
  api.mockResolvedValueOnce(saved);
  mount();
  await screen.findByText('Saved to your library');
  expect(api.mock.calls[0][0]).toBe(`/melodies/${saved.id}`);
  await title('Edited after refresh');
  api.mockResolvedValueOnce({ ...saved, revision: 2 });
  fireEvent.click(screen.getByRole('button', { name: 'Save melody' }));
  await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
  expect(api.mock.calls[1][1].method).toBe('PATCH');
});
it('recovered draft waits for user review instead of automatically overwriting cloud data', async () => {
  const saved = result();
  localStorage.setItem(
    `humline.draft.v1:alice:${saved.id}`,
    JSON.stringify({ project: { ...saved.project, title: 'Recovery' }, revision: 1 }),
  );
  api.mockResolvedValueOnce({ ...saved, revision: 2 });
  mount(saved.id);
  await screen.findByText(/Recovered a browser draft/);
  expect((screen.getByLabelText('Test melody title') as HTMLInputElement).value).toBe('Recovery');
  expect(api).toHaveBeenCalledTimes(1);
});
