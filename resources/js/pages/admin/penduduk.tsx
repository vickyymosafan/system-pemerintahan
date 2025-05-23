import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import { Edit, PlusCircle, Search, Trash2, Users, UserCheck, UserX, Calendar, Clock, Loader2, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Pagination } from '@/components/ui/pagination';
import debounce from 'lodash/debounce';
import type { PageProps } from '@/types';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface PendudukData {
    id: number;
    nik: string;
    nama: string;
    alamat: string;
    jenis_kelamin: string;
    tempat_lahir: string;
    tanggal_lahir: string;
    agama: string | null;
    status_perkawinan: string | null;
    pekerjaan: string | null;
    kewarganegaraan: string;
    created_at: string;
    updated_at: string;
    user_id: number;
    registration_date?: string;
    registration_date_formatted?: string;
    user?: {
        id: number;
        email: string;
        role?: string;
        created_at?: string;
    };
}

interface PendudukProps extends PageProps {
    penduduk: {
        data: PendudukData[];
        links: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
        current_page: number;
        last_page: number;
    };
    filters: {
        search: string | null;
    };
}

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    description?: string;
    color?: 'default' | 'blue' | 'green' | 'orange' | 'purple' | 'red';
    delay?: number;
}

function StatsCard({ title, value, icon, description, color = 'default', delay = 0 }: StatsCardProps) {
    const colorClasses = {
        default: 'from-zinc-500/20 to-zinc-500/5 text-zinc-600 dark:from-zinc-400/10 dark:to-zinc-400/5 dark:text-zinc-200',
        blue: 'from-blue-500/20 to-blue-500/5 text-blue-600 dark:from-blue-400/10 dark:to-blue-400/5 dark:text-blue-200',
        green: 'from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:from-emerald-400/10 dark:to-emerald-400/5 dark:text-emerald-200',
        orange: 'from-orange-500/20 to-orange-500/5 text-orange-600 dark:from-orange-400/10 dark:to-orange-400/5 dark:text-orange-200',
        purple: 'from-purple-500/20 to-purple-500/5 text-purple-600 dark:from-purple-400/10 dark:to-purple-400/5 dark:text-purple-200',
        red: 'from-red-500/20 to-red-500/5 text-red-600 dark:from-red-400/10 dark:to-red-400/5 dark:text-red-200',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay * 0.1 }}
            className="h-full"
        >
            <Card className={cn("bg-gradient-to-br h-full flex flex-col", colorClasses[color])}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    <div className={cn("p-2 rounded-full bg-white/20", colorClasses[color])}>
                        {icon}
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col justify-between flex-grow">
                    <div className="text-3xl font-bold tracking-tight">{value}</div>
                    <div className="h-4">
                        {description && (
                            <p className="text-xs text-current/70 mt-1 font-medium">{description}</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Manajemen Penduduk',
        href: '/admin/penduduk',
    },
];

export default function Penduduk({ penduduk, filters, flash }: PendudukProps) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [pendudukToDelete, setPendudukToDelete] = useState<PendudukData | null>(null);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');

    // Stats calculations
    const totalPenduduk = penduduk.data.length;
    const completePenduduk = penduduk.data.filter(p => p.nik).length;
    const incompletePenduduk = totalPenduduk - completePenduduk;
    const recentRegistrations = penduduk.data.filter(p => {
        if (!p.user?.created_at) return false;
        const createdDate = new Date(p.user.created_at);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return createdDate >= oneWeekAgo;
    }).length;

    // Display flash messages from Laravel as toast notifications
    useEffect(() => {
        if (flash?.message) {
            toast({
                title: flash.type === 'success' ? 'Sukses' : 'Error',
                description: flash.message,
                variant: flash.type === 'error' ? 'destructive' : 'default'
            });
        }
    }, [flash]);

    const { data, setData, post, processing, errors, reset } = useForm<{
        nik: string;
        nama: string;
        alamat: string;
        jenis_kelamin: string;
        tempat_lahir: string;
        tanggal_lahir: string;
        agama: string | null;
        status_perkawinan: string | null;
        pekerjaan: string | null;
        kewarganegaraan: string;
        email: string;
        password: string;
        role: string;
    }>({
        nik: '',
        nama: '',
        alamat: '',
        jenis_kelamin: 'Laki-laki',
        tempat_lahir: '',
        tanggal_lahir: new Date().toISOString().split('T')[0],
        agama: '',
        status_perkawinan: '',
        pekerjaan: '',
        kewarganegaraan: 'Indonesia',
        email: '',
        password: '',
        role: 'penduduk',
    });

    const { data: editData, setData: setEditData, put, processing: editProcessing, errors: editErrors, reset: resetEdit } = useForm({
        id: '',
        nik: '',
        nama: '',
        alamat: '',
        jenis_kelamin: 'Laki-laki',
        tempat_lahir: '',
        tanggal_lahir: '',
        agama: '',
        status_perkawinan: '',
        pekerjaan: '',
        kewarganegaraan: 'Indonesia',
        email: '',
        user_id: '',
    });

    const debouncedSearch = debounce((value: string) => {
        router.get(
            route('admin.penduduk'), 
            { search: value },
            { preserveState: true, preserveScroll: true }
        );
    }, 300);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        debouncedSearch(value);
    };

    const handleAddSubmit = () => {
        post(route('admin.penduduk.store'), {
            onSuccess: () => {
                reset();
                setIsAddModalOpen(false);
                // Update local state for immediate UI feedback
                router.reload();
            },
        });
    };

    const openEditModal = (penduduk: PendudukData) => {
        setEditData({
            id: penduduk.id.toString(),
            nik: penduduk.nik,
            nama: penduduk.nama,
            alamat: penduduk.alamat,
            jenis_kelamin: penduduk.jenis_kelamin,
            tempat_lahir: penduduk.tempat_lahir,
            tanggal_lahir: penduduk.tanggal_lahir.split('T')[0], // Format date for input
            agama: penduduk.agama || '',
            status_perkawinan: penduduk.status_perkawinan || '',
            pekerjaan: penduduk.pekerjaan || '',
            kewarganegaraan: penduduk.kewarganegaraan,
            email: penduduk.user?.email || '',
            user_id: penduduk.user_id.toString(),
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = () => {
        put(route('admin.penduduk.update', { penduduk: editData.id }), {
            onSuccess: () => {
                resetEdit();
                setIsEditModalOpen(false);
                router.reload();
            },
        });
    };

    const openDeleteModal = (penduduk: PendudukData) => {
        setPendudukToDelete(penduduk);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteSubmit = () => {
        if (!pendudukToDelete) return;

        router.delete(route('admin.penduduk.destroy', { penduduk: pendudukToDelete.id }), {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                setPendudukToDelete(null);
                // No need to reload as Inertia will handle the redirect from the controller
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manajemen Penduduk" />
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex h-full flex-1 flex-col gap-6 p-6"
            >
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold tracking-tight">Manajemen Penduduk</h1>
                    <p className="text-muted-foreground">Kelola data dan akun penduduk dalam sistem.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <StatsCard
                        title="Total Penduduk"
                        value={totalPenduduk.toLocaleString()}
                        icon={<Users className="h-5 w-5" />}
                        color="blue"
                        delay={0}
                    />
                    <StatsCard
                        title="Data Lengkap"
                        value={completePenduduk.toLocaleString()}
                        icon={<UserCheck className="h-5 w-5" />}
                        color="green"
                        delay={1}
                        description="Penduduk dengan data lengkap"
                    />
                    <StatsCard
                        title="Data Belum Lengkap"
                        value={incompletePenduduk.toLocaleString()}
                        icon={<UserX className="h-5 w-5" />}
                        color="orange"
                        delay={2}
                        description="Perlu melengkapi data"
                    />
                    <StatsCard
                        title="Registrasi Baru"
                        value={recentRegistrations.toLocaleString()}
                        icon={<Calendar className="h-5 w-5" />}
                        color="purple"
                        delay={3}
                        description="Dalam 7 hari terakhir"
                    />
                </div>

                <Card className="overflow-hidden border-none shadow-md">
                    <CardHeader className="bg-card pb-6 border-b">
                        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    Data Penduduk
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Total {penduduk.data.length} penduduk {searchQuery && 'ditemukan'}
                                </p>
                            </div>
                            <div className="flex space-x-2">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        type="search"
                                        placeholder="Cari Email atau Nama..."
                                        className="w-full pl-9 bg-background sm:w-64"
                                        value={searchQuery}
                                        onChange={handleSearchChange}
                                    />
                                </div>
                                <Button onClick={() => setIsAddModalOpen(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Tambah Penduduk
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                        <TableHead className="w-[220px]">Nama</TableHead>
                                        <TableHead className="w-[220px]">Email</TableHead>
                                        <TableHead className="w-[150px]">Status Data</TableHead>
                                        <TableHead className="w-[180px]">Tanggal Registrasi</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {penduduk.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5}>
                                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                                    <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
                                                    {searchQuery ? (
                                                        <>
                                                            <p className="text-muted-foreground font-medium">Tidak ada penduduk ditemukan</p>
                                                            <p className="text-sm text-muted-foreground/70 mt-1">
                                                                Coba dengan kata kunci lain atau reset pencarian
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="text-muted-foreground font-medium">Belum ada data penduduk</p>
                                                            <p className="text-sm text-muted-foreground/70 mt-1">
                                                                Tambahkan penduduk baru dengan menekan tombol "Tambah Penduduk"
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        penduduk.data.map((item, index) => (
                                            <motion.tr 
                                                key={item.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.2, delay: index * 0.05 }}
                                                className="group hover:bg-muted/50"
                                            >
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <div className="bg-primary/10 p-1.5 rounded-full">
                                                            <User className="h-3 w-3 text-primary" />
                                                        </div>
                                                        <span>{item.nama}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                        {item.user?.email || '-'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {item.nik ? (
                                                        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 flex items-center gap-1.5">
                                                            <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                                            Lengkap
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200 flex items-center gap-1.5">
                                                            <span className="relative flex h-2 w-2">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                                                            </span>
                                                            Belum Lengkap
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="bg-muted p-1.5 rounded-full">
                                                            <Calendar className="h-3 w-3 text-muted-foreground" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span>{item.registration_date_formatted || '-'}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {item.registration_date ? new Date(item.registration_date).toLocaleDateString('id-ID') : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button 
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEditModal(item)}
                                                            className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                            title={item.nik ? "Edit Data" : "Lengkapi Data"}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openDeleteModal(item)}
                                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            title="Hapus Data"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </motion.tr>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {penduduk.last_page > 1 && (
                            <div className="px-4 py-4 border-t">
                                <Pagination className="justify-center">
                                    {penduduk.links.map((link, i) => (
                                        <Button
                                            key={i}
                                            variant={link.active ? "default" : "outline"}
                                            className="mx-1 h-8 w-8 p-0"
                                            disabled={!link.url}
                                            onClick={() => link.url && router.get(link.url)}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </Pagination>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Add Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader className="pb-4 border-b">
                        <DialogTitle className="text-xl">Tambah Penduduk Baru</DialogTitle>
                        <DialogDescription className="text-muted-foreground mt-1">
                            Tambahkan penduduk baru ke dalam sistem. Data dengan tanda <span className="text-red-500">*</span> wajib diisi.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-5 py-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label htmlFor="nama" className="font-medium">
                                    Nama Lengkap <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="nama"
                                    placeholder="Masukkan Nama Lengkap"
                                    value={data.nama}
                                    onChange={(e) => setData('nama', e.target.value)}
                                    className={cn(
                                        "bg-background focus:ring-2 focus:ring-primary/20",
                                        errors.nama && "border-red-500 focus:ring-red-500/20"
                                    )}
                                />
                                {errors.nama && <p className="text-xs text-red-500 mt-1">{errors.nama}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="font-medium">
                                    Email <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Masukkan Email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className={cn(
                                        "bg-background focus:ring-2 focus:ring-primary/20",
                                        errors.email && "border-red-500 focus:ring-red-500/20"
                                    )}
                                />
                                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="font-medium">
                                Password <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Masukkan Password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className={cn(
                                    "bg-background focus:ring-2 focus:ring-primary/20",
                                    errors.password && "border-red-500 focus:ring-red-500/20"
                                )}
                            />
                            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                        </div>

                        <div className="grid grid-cols-1 mt-4">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-medium">Data Kependudukan (Opsional)</h3>
                                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                                    Opsional
                                </Badge>
                            </div>
                            <div className="h-px w-full bg-border mb-4"></div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label htmlFor="nik" className="font-medium">NIK</Label>
                                    <Input
                                        id="nik"
                                        placeholder="Masukkan NIK (16 Digit)"
                                        value={data.nik}
                                        onChange={(e) => setData('nik', e.target.value)}
                                        className={cn(
                                            "bg-background focus:ring-2 focus:ring-primary/20",
                                            errors.nik && "border-red-500 focus:ring-red-500/20"
                                        )}
                                        maxLength={16}
                                    />
                                    {errors.nik && <p className="text-xs text-red-500 mt-1">{errors.nik}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="alamat" className="font-medium">Alamat</Label>
                                    <Input
                                        id="alamat"
                                        placeholder="Masukkan Alamat"
                                        value={data.alamat}
                                        onChange={(e) => setData('alamat', e.target.value)}
                                        className={cn(
                                            "bg-background focus:ring-2 focus:ring-primary/20",
                                            errors.alamat && "border-red-500 focus:ring-red-500/20"
                                        )}
                                    />
                                    {errors.alamat && <p className="text-xs text-red-500 mt-1">{errors.alamat}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Hidden but necessary fields */}
                        <div className="hidden">
                            <Input
                                id="role"
                                value={data.role}
                                onChange={(e) => setData('role', e.target.value)}
                            />
                            <Input
                                id="jenis_kelamin"
                                value={data.jenis_kelamin}
                                onChange={(e) => setData('jenis_kelamin', e.target.value)}
                            />
                            <Input
                                id="tempat_lahir"
                                value={data.tempat_lahir}
                                onChange={(e) => setData('tempat_lahir', e.target.value)}
                            />
                            <Input
                                id="tanggal_lahir"
                                type="date" 
                                value={data.tanggal_lahir}
                                onChange={(e) => setData('tanggal_lahir', e.target.value)}
                            />
                            <Input
                                id="agama"
                                value={data.agama || ''}
                                onChange={(e) => setData('agama', e.target.value)}
                            />
                            <Input
                                id="status_perkawinan"
                                value={data.status_perkawinan || ''}
                                onChange={(e) => setData('status_perkawinan', e.target.value)}
                            />
                            <Input
                                id="pekerjaan"
                                value={data.pekerjaan || ''}
                                onChange={(e) => setData('pekerjaan', e.target.value)}
                            />
                            <Input
                                id="kewarganegaraan"
                                value={data.kewarganegaraan}
                                onChange={(e) => setData('kewarganegaraan', e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
                        <Button variant="outline" onClick={() => {
                            setIsAddModalOpen(false);
                            reset();
                        }}>
                            Batal
                        </Button>
                        <Button 
                            onClick={handleAddSubmit} 
                            disabled={processing}
                            className="gap-1"
                        >
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader className="pb-4 border-b">
                        <DialogTitle className="text-xl">Edit Data Penduduk</DialogTitle>
                        <DialogDescription className="text-muted-foreground mt-1">
                            Perbarui informasi penduduk. Data dengan tanda <span className="text-red-500">*</span> wajib diisi.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-5 py-5">
                        <div className="space-y-2">
                            <Label htmlFor="edit-nama" className="font-medium">
                                Nama Lengkap <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="edit-nama"
                                placeholder="Masukkan Nama Lengkap"
                                value={editData.nama}
                                onChange={(e) => setEditData('nama', e.target.value)}
                                className={cn(
                                    "bg-background focus:ring-2 focus:ring-primary/20",
                                    editErrors.nama && "border-red-500 focus:ring-red-500/20"
                                )}
                            />
                            {editErrors.nama && <p className="text-xs text-red-500 mt-1">{editErrors.nama}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-email" className="font-medium">Email (Terhubung dengan Akun)</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={editData.email}
                                readOnly
                                disabled
                                className="bg-gray-100 dark:bg-gray-800"
                            />
                            <p className="text-xs text-muted-foreground">Email tidak dapat diubah karena terhubung dengan akun pengguna</p>
                        </div>

                        <div className="grid grid-cols-1 mt-4">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-medium">Data Kependudukan</h3>
                                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                                    Wajib untuk Dokumen
                                </Badge>
                            </div>
                            <div className="h-px w-full bg-border mb-4"></div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-nik" className="font-medium">
                                        NIK <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="edit-nik"
                                        placeholder="Masukkan NIK (16 Digit)"
                                        value={editData.nik}
                                        onChange={(e) => setEditData('nik', e.target.value)}
                                        className={cn(
                                            "bg-background focus:ring-2 focus:ring-primary/20",
                                            editErrors.nik && "border-red-500 focus:ring-red-500/20"
                                        )}
                                        maxLength={16}
                                    />
                                    {editErrors.nik && <p className="text-xs text-red-500 mt-1">{editErrors.nik}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit-alamat" className="font-medium">Alamat</Label>
                                    <Input
                                        id="edit-alamat"
                                        placeholder="Masukkan Alamat"
                                        value={editData.alamat}
                                        onChange={(e) => setEditData('alamat', e.target.value)}
                                        className={cn(
                                            "bg-background focus:ring-2 focus:ring-primary/20",
                                            editErrors.alamat && "border-red-500 focus:ring-red-500/20"
                                        )}
                                    />
                                    {editErrors.alamat && <p className="text-xs text-red-500 mt-1">{editErrors.alamat}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label htmlFor="edit-jenis_kelamin" className="font-medium">Jenis Kelamin</Label>
                                <Select 
                                    value={editData.jenis_kelamin} 
                                    onValueChange={(value) => setEditData('jenis_kelamin', value)}
                                >
                                    <SelectTrigger id="edit-jenis_kelamin" className="bg-background">
                                        <SelectValue placeholder="Pilih Jenis Kelamin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                                        <SelectItem value="Perempuan">Perempuan</SelectItem>
                                    </SelectContent>
                                </Select>
                                {editErrors.jenis_kelamin && <p className="text-xs text-red-500 mt-1">{editErrors.jenis_kelamin}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-tempat_lahir" className="font-medium">Tempat Lahir</Label>
                                <Input
                                    id="edit-tempat_lahir"
                                    placeholder="Masukkan Tempat Lahir"
                                    value={editData.tempat_lahir}
                                    onChange={(e) => setEditData('tempat_lahir', e.target.value)}
                                    className={cn(
                                        "bg-background focus:ring-2 focus:ring-primary/20",
                                        editErrors.tempat_lahir && "border-red-500 focus:ring-red-500/20"
                                    )}
                                />
                                {editErrors.tempat_lahir && <p className="text-xs text-red-500 mt-1">{editErrors.tempat_lahir}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label htmlFor="edit-tanggal_lahir" className="font-medium">Tanggal Lahir</Label>
                                <Input
                                    id="edit-tanggal_lahir"
                                    type="date"
                                    value={editData.tanggal_lahir}
                                    onChange={(e) => setEditData('tanggal_lahir', e.target.value)}
                                    className={cn(
                                        "bg-background focus:ring-2 focus:ring-primary/20",
                                        editErrors.tanggal_lahir && "border-red-500 focus:ring-red-500/20"
                                    )}
                                />
                                {editErrors.tanggal_lahir && <p className="text-xs text-red-500 mt-1">{editErrors.tanggal_lahir}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-agama" className="font-medium">Agama</Label>
                                <Select 
                                    value={editData.agama || ''} 
                                    onValueChange={(value) => setEditData('agama', value)}
                                >
                                    <SelectTrigger id="edit-agama" className="bg-background">
                                        <SelectValue placeholder="Pilih Agama" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Islam">Islam</SelectItem>
                                        <SelectItem value="Kristen">Kristen</SelectItem>
                                        <SelectItem value="Katolik">Katolik</SelectItem>
                                        <SelectItem value="Hindu">Hindu</SelectItem>
                                        <SelectItem value="Buddha">Buddha</SelectItem>
                                        <SelectItem value="Konghucu">Konghucu</SelectItem>
                                    </SelectContent>
                                </Select>
                                {editErrors.agama && <p className="text-xs text-red-500 mt-1">{editErrors.agama}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label htmlFor="edit-status_perkawinan" className="font-medium">Status Perkawinan</Label>
                                <Select 
                                    value={editData.status_perkawinan || ''} 
                                    onValueChange={(value) => setEditData('status_perkawinan', value)}
                                >
                                    <SelectTrigger id="edit-status_perkawinan" className="bg-background">
                                        <SelectValue placeholder="Pilih Status Perkawinan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Belum Kawin">Belum Kawin</SelectItem>
                                        <SelectItem value="Kawin">Kawin</SelectItem>
                                        <SelectItem value="Cerai Hidup">Cerai Hidup</SelectItem>
                                        <SelectItem value="Cerai Mati">Cerai Mati</SelectItem>
                                    </SelectContent>
                                </Select>
                                {editErrors.status_perkawinan && <p className="text-xs text-red-500 mt-1">{editErrors.status_perkawinan}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-pekerjaan" className="font-medium">Pekerjaan</Label>
                                <Input
                                    id="edit-pekerjaan"
                                    placeholder="Masukkan Pekerjaan"
                                    value={editData.pekerjaan || ''}
                                    onChange={(e) => setEditData('pekerjaan', e.target.value)}
                                    className={cn(
                                        "bg-background focus:ring-2 focus:ring-primary/20",
                                        editErrors.pekerjaan && "border-red-500 focus:ring-red-500/20"
                                    )}
                                />
                                {editErrors.pekerjaan && <p className="text-xs text-red-500 mt-1">{editErrors.pekerjaan}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-kewarganegaraan" className="font-medium">Kewarganegaraan</Label>
                            <Input
                                id="edit-kewarganegaraan"
                                placeholder="Masukkan Kewarganegaraan"
                                value={editData.kewarganegaraan}
                                onChange={(e) => setEditData('kewarganegaraan', e.target.value)}
                                className={cn(
                                    "bg-background focus:ring-2 focus:ring-primary/20",
                                    editErrors.kewarganegaraan && "border-red-500 focus:ring-red-500/20"
                                )}
                            />
                            {editErrors.kewarganegaraan && <p className="text-xs text-red-500 mt-1">{editErrors.kewarganegaraan}</p>}
                        </div>

                        {/* Hidden but necessary fields */}
                        <div className="hidden">
                            <Input
                                id="edit-user_id"
                                value={editData.user_id}
                                onChange={(e) => setEditData('user_id', e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
                        <Button variant="outline" onClick={() => {
                            setIsEditModalOpen(false);
                            resetEdit();
                        }}>
                            Batal
                        </Button>
                        <Button 
                            onClick={handleEditSubmit} 
                            disabled={editProcessing}
                            className="gap-1"
                        >
                            {editProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Simpan Perubahan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-red-500" />
                            Konfirmasi Hapus Data
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground mt-1">
                            Tindakan ini tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 flex flex-col gap-3">
                        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 border border-red-200 dark:border-red-900">
                            <p className="text-red-800 dark:text-red-300">
                                Anda akan menghapus data penduduk:
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                                <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-full">
                                    <User className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </div>
                                <p className="font-medium text-lg text-red-900 dark:text-red-200">
                                    {pendudukToDelete?.nama}
                                </p>
                            </div>
                            {pendudukToDelete?.user?.email && (
                                <p className="text-sm text-red-700 dark:text-red-400 mt-2 flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                    {pendudukToDelete.user.email}
                                </p>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Menghapus data penduduk juga akan menghapus akun terkait dan semua dokumen yang telah diajukan. Apakah Anda yakin ingin melanjutkan?
                        </p>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => {
                            setIsDeleteModalOpen(false);
                            setPendudukToDelete(null);
                        }}>
                            Batal
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleDeleteSubmit}
                            disabled={processing}
                            className="gap-1"
                        >
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus Data
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
