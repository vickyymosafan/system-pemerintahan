<?php

namespace App\Http\Controllers;

use App\Models\Penduduk;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PendudukController extends Controller
{
    /**
     * Display a listing of the penduduk.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        
        $penduduk = Penduduk::query()
            ->with('user:id,email,created_at') // Add created_at to get registration timestamp
            ->when($search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('nama', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($q) use ($search) {
                            $q->where('email', 'like', "%{$search}%");
                        });
                });
            })
            ->latest()
            ->paginate(10)
            ->withQueryString();
            
        // Transform data to include registration date in easily accessible format
        $penduduk->through(function ($item) {
            $item->registration_date = $item->user->created_at->format('Y-m-d H:i:s');
            $item->registration_date_formatted = $item->user->created_at->diffForHumans();
            return $item;
        });
            
        return Inertia::render('admin/penduduk', [
            'penduduk' => $penduduk,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    /**
     * Store a newly created penduduk in storage.
     */
    public function store(Request $request, ActivityLogService $activityLogService)
    {
        $validated = $request->validate([
            'nik' => ['nullable', 'string', 'size:16', 'unique:penduduks,nik'],
            'nama' => ['required', 'string', 'max:255'],
            'alamat' => ['nullable', 'string'],
            'jenis_kelamin' => ['required', 'in:Laki-laki,Perempuan'],
            'tempat_lahir' => ['nullable', 'string', 'max:255'],
            'tanggal_lahir' => ['nullable', 'date'],
            'agama' => ['nullable', 'string', 'max:255'],
            'status_perkawinan' => ['nullable', 'string', 'max:255'],
            'pekerjaan' => ['nullable', 'string', 'max:255'],
            'kewarganegaraan' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        // Create user
        $user = User::create([
            'name' => $validated['nama'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => User::ROLE_PENDUDUK,
        ]);

        // Create penduduk
        $penduduk = Penduduk::create([
            'user_id' => $user->id,
            'nik' => $validated['nik'] ?? null,
            'nama' => $validated['nama'],
            'alamat' => $validated['alamat'] ?? null,
            'jenis_kelamin' => $validated['jenis_kelamin'],
            'tempat_lahir' => $validated['tempat_lahir'] ?? null,
            'tanggal_lahir' => $validated['tanggal_lahir'] ?? now(),
            'agama' => $validated['agama'] ?? null,
            'status_perkawinan' => $validated['status_perkawinan'] ?? null,
            'pekerjaan' => $validated['pekerjaan'] ?? null,
            'kewarganegaraan' => $validated['kewarganegaraan'] ?? 'Indonesia',
        ]);

        // Log the activity
        $activityLogService->logPendudukActivity(
            'create_penduduk',
            'Menambahkan penduduk baru: ' . $validated['nama'],
            $penduduk->id,
            [
                'nama' => $validated['nama'],
                'email' => $validated['email']
            ]
        );

        return redirect()->route('admin.penduduk')->with('message', 'Penduduk berhasil ditambahkan.')->with('type', 'success');
    }

    /**
     * Display the specified penduduk.
     */
    public function show(Penduduk $penduduk)
    {
        // Load user relationship to access email and registration date
        $penduduk->load('user:id,email,created_at');
        
        // Add formatted registration date
        $penduduk->registration_date = $penduduk->user->created_at->format('Y-m-d H:i:s');
        $penduduk->registration_date_formatted = $penduduk->user->created_at->diffForHumans();
        
        return response()->json($penduduk);
    }

    /**
     * Update the specified penduduk in storage.
     */
    public function update(Request $request, Penduduk $penduduk, ActivityLogService $activityLogService)
    {
        $validated = $request->validate([
            'nik' => ['nullable', 'string', 'size:16', Rule::unique('penduduks', 'nik')->ignore($penduduk)],
            'nama' => ['required', 'string', 'max:255'],
            'alamat' => ['nullable', 'string'],
            'jenis_kelamin' => ['required', 'in:Laki-laki,Perempuan'],
            'tempat_lahir' => ['nullable', 'string', 'max:255'],
            'tanggal_lahir' => ['nullable', 'date'],
            'agama' => ['nullable', 'string', 'max:255'],
            'status_perkawinan' => ['nullable', 'string', 'max:255'],
            'pekerjaan' => ['nullable', 'string', 'max:255'],
            'kewarganegaraan' => ['nullable', 'string', 'max:255'],
        ]);

        // Update user name
        $penduduk->user()->update([
            'name' => $validated['nama'],
        ]);

        // Update penduduk
        $penduduk->update($validated);

        // Log the activity
        $activityLogService->logPendudukActivity(
            'update_penduduk',
            'Memperbarui data penduduk: ' . $validated['nama'],
            $penduduk->id,
            [
                'nama' => $validated['nama'],
                'nik' => $validated['nik'] ?? null
            ]
        );

        return redirect()->route('admin.penduduk')->with('message', 'Penduduk berhasil diperbarui.')->with('type', 'success');
    }

    /**
     * Remove the specified penduduk from storage.
     */
    public function destroy(Penduduk $penduduk, ActivityLogService $activityLogService)
    {
        // Log the activity before deletion
        $activityLogService->logPendudukActivity(
            'delete_penduduk',
            'Menghapus penduduk: ' . $penduduk->nama,
            $penduduk->id,
            [
                'nama' => $penduduk->nama,
                'nik' => $penduduk->nik
            ]
        );

        // Delete user (will cascade to penduduk)
        $penduduk->user()->delete();

        return redirect()->route('admin.penduduk')->with('message', 'Penduduk berhasil dihapus.')->with('type', 'success');
    }
}
