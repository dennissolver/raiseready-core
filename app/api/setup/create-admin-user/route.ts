import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface CreateAdminUserRequest {
  supabaseUrl: string;
  supabaseServiceKey: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  companyName: string;
  tempPassword: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateAdminUserRequest = await req.json();
    const {
      supabaseUrl,
      supabaseServiceKey,
      adminEmail,
      adminFirstName,
      adminLastName,
      companyName,
      tempPassword,
    } = body;

    if (!supabaseUrl || !supabaseServiceKey || !adminEmail) {
      return NextResponse.json({
        error: 'supabaseUrl, supabaseServiceKey, and adminEmail required'
      }, { status: 400 });
    }

    // Create Supabase client for the CLIENT's project (not template)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log(`Creating admin user: ${adminEmail}`);

    // Step 1: Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === adminEmail);

    let userId: string;

    if (existingUser) {
      console.log('Admin user already exists:', existingUser.id);
      userId = existingUser.id;

      // Update password if user exists
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: tempPassword,
        email_confirm: true,
      });

      if (updateError) {
        console.warn('Could not update password:', updateError.message);
      }
    } else {
      // Step 2: Create user in Supabase Auth
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: tempPassword,
        email_confirm: true, // Skip email verification for admin
        user_metadata: {
          first_name: adminFirstName,
          last_name: adminLastName,
          full_name: `${adminFirstName} ${adminLastName}`,
          company: companyName,
        },
      });

      if (createError) {
        console.error('Failed to create admin user:', createError);
        return NextResponse.json({
          error: `Failed to create user: ${createError.message}`
        }, { status: 500 });
      }

      userId = newUser.user.id;
      console.log('Admin user created:', userId);
    }

    // Step 3: Create or update profile with admin role
    const profileData = {
      id: userId,
      email: adminEmail,
      full_name: `${adminFirstName} ${adminLastName}`,
      first_name: adminFirstName,
      last_name: adminLastName,
      user_type: 'investor',
      is_admin: true,
      company_name: companyName,
      updated_at: new Date().toISOString(),
    };

    // Try upsert (insert or update)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });

    if (profileError) {
      // Profile table might not exist yet or have different schema
      console.warn('Profile upsert warning:', profileError.message);

      // Try insert only
      const { error: insertError } = await supabase
        .from('profiles')
        .insert(profileData);

      if (insertError && !insertError.message.includes('duplicate')) {
        console.warn('Profile insert also failed:', insertError.message);
        // Don't fail - user is created, profile can be set up later
      }
    }

    console.log('Admin profile configured');

    return NextResponse.json({
      success: true,
      userId,
      email: adminEmail,
      role: 'investor',
      isAdmin: true,
    });

  } catch (error) {
    console.error('Create admin user error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}