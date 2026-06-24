import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// GET - Daftar semua materi
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Ambil user yang sedang login
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ambil materi dengan info guru
    const { data: materials, error } = await supabase
      .from('materials')
      .select(`
        *,
        profiles:teacher_id (
          name,
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching materials:', error)
      return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 })
    }

    // Transformasi data untuk menyertakan nama guru
    const transformedMaterials = materials?.map(m => ({
      ...m,
      teacher_name: m.profiles?.full_name || m.profiles?.name || 'Unknown',
      profiles: undefined,
    })) || []

    return NextResponse.json({
      success: true,
      materials: transformedMaterials,
    })
  } catch (error: any) {
    console.error('Materials GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Upload materi baru
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user, with fallback to Authorization header
    const authHeader = request.headers.get('Authorization')
    let user = null
    let authError = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const res = await supabase.auth.getUser(token)
      user = res.data.user
      authError = res.error
    } else {
      const res = await supabase.auth.getUser()
      user = res.data.user
      authError = res.error
    }
    
    if (authError || !user) {
      console.error('Auth error in POST /api/materials:', authError)
      return NextResponse.json({ 
        error: `Unauthorized: ${authError?.message || 'Session expired or missing'}` 
      }, { status: 401 })
    }

    // Check if user is guru
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, name, full_name')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'guru') {
      return NextResponse.json({ error: 'Only teachers can upload materials' }, { status: 403 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string

    if (!file || !title) {
      return NextResponse.json({ error: 'File and title are required' }, { status: 400 })
    }

    // Validasi tipe file
    const fileName = file.name.toLowerCase()
    const validExtensions = ['.pdf', '.ppt', '.pptx']
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'))
    
    if (!validExtensions.includes(fileExtension)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only PDF, PPT, and PPTX are allowed' 
      }, { status: 400 })
    }

    // Validasi ukuran file (maksimal 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 50MB' 
      }, { status: 400 })
    }

    // Gunakan admin client untuk upload storage
    const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Generate nama file unik
    const timestamp = Date.now()
    const safeName = fileName.replace(/[^a-z0-9.-]/gi, '_')
    const storagePath = `materials/${user.id}/${timestamp}_${safeName}`

    // Upload file langsung ke Supabase Storage (menggunakan objek File)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('materials')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: `Gagal mengupload ke storage: ${uploadError.message}` }, { status: 500 })
    }

    // Ambil URL publik
    const { data: urlData } = supabaseAdmin.storage
      .from('materials')
      .getPublicUrl(storagePath)

    // Tentukan tipe file
    let fileType: 'pdf' | 'ppt' | 'pptx' = 'pdf'
    if (fileExtension === '.ppt') fileType = 'ppt'
    else if (fileExtension === '.pptx') fileType = 'pptx'

    // Simpan ke database
    const { data: material, error: dbError } = await supabaseAdmin
      .from('materials')
      .insert({
        teacher_id: user.id,
        title,
        description: description || null,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: fileType,
        file_size: file.size,
        category: category || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Coba hapus file yang sudah diupload jika insert db gagal
      await supabaseAdmin.storage.from('materials').remove([storagePath])
      return NextResponse.json({ error: `Gagal menyimpan info ke database: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Material uploaded successfully',
      material: {
        ...material,
        teacher_name: profile?.full_name || profile?.name,
      },
    })
  } catch (error: any) {
    console.error('Materials POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Hapus materi
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const materialId = searchParams.get('id')

    if (!materialId) {
      return NextResponse.json({ error: 'Material ID required' }, { status: 400 })
    }

    // Ambil user yang sedang login, fallback to Authorization header
    const authHeader = request.headers.get('Authorization')
    let user = null
    let authError = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const res = await supabase.auth.getUser(token)
      user = res.data.user
      authError = res.error
    } else {
      const res = await supabase.auth.getUser()
      user = res.data.user
      authError = res.error
    }
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Cek apakah user adalah guru
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'guru') {
      return NextResponse.json({ error: 'Only teachers can delete materials' }, { status: 403 })
    }

    // Gunakan admin client
    const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Ambil info materi terlebih dahulu
    const { data: material, error: fetchError } = await supabaseAdmin
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .single()

    if (fetchError || !material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    // Ekstrak path storage dari URL
    // Contoh URL: https://[projectId].supabase.co/storage/v1/object/public/materials/materials/user_id/file.pdf
    const publicUrlPrefix = `${supabaseUrl}/storage/v1/object/public/materials/`
    let storagePath = ''
    
    if (material.file_url.startsWith(publicUrlPrefix)) {
      storagePath = material.file_url.substring(publicUrlPrefix.length)
    } else {
      // Fallback
      const urlParts = material.file_url.split('/materials/')
      if (urlParts.length > 2) {
        storagePath = urlParts.slice(2).join('/materials/')
      } else if (urlParts.length === 2) {
        storagePath = urlParts[1]
      }
    }

    if (storagePath) {
      // Hapus dari storage
      const { error: removeError } = await supabaseAdmin.storage.from('materials').remove([storagePath])
      if (removeError) console.error('Error removing file from storage:', removeError)
    }

    // Hapus dari database
    const { error: deleteError } = await supabaseAdmin
      .from('materials')
      .delete()
      .eq('id', materialId)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Material deleted successfully',
    })
  } catch (error: any) {
    console.error('Materials DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
