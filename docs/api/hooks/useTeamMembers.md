# useTeamMembers API Documentation

## Overview

React Query hooks for managing Team Members in the CMS. Team members represent company personnel with profiles, skills, social links, and display priority.

**Purpose**: CRUD operations and filtering for team member management
**Location**: Admin team pages and public About/Team pages
**Dependencies**: React Query, Supabase client, custom query utilities

## Import

```typescript
import {
  useTeamMembers,
  useTeamMember,
  useActiveTeamMembers,
  useCreateTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
  useToggleTeamMemberActive
} from '@/hooks/useTeamMembers';
```

## Type Definitions

```typescript
interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio?: string | null;
  avatar?: string | null;
  email?: string | null;
  skills: string[]; // Array of skill names
  social_links: TeamMemberSocialLinks;
  priority: number; // Display order (higher = first)
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface TeamMemberSocialLinks {
  github?: string;
  linkedin?: string;
  twitter?: string;
  website?: string;
}

type TeamMemberInsert = Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>;
type TeamMemberUpdate = Partial<Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>>;
```

## API Reference

### Query Hooks

#### useTeamMembers()

Fetches all team members sorted by priority (high to low), then creation date.

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | TeamMember[] | All team members |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |
| refetch | () => void | Manually refetch data |

**Cache Settings**:
- Query Key: `['team-members']`
- Stale Time: 5 minutes

**Example**:
```typescript
const { data: teamMembers, isLoading } = useTeamMembers();

return (
  <div className="team-grid">
    {teamMembers.map(member => (
      <TeamMemberCard key={member.id} member={member} />
    ))}
  </div>
);
```

---

#### useTeamMember(id)

Fetches a single team member by ID.

**Parameters**:
- `id: string` - UUID of the team member

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | TeamMember \| null | Team member or null if not found |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Notes**:
- Query is disabled if `id` is empty
- Returns fallback value `null` if not found

**Example**:
```typescript
const { data: member } = useTeamMember(memberId);

if (!member) return <NotFound />;
return <TeamMemberDetail member={member} />;
```

---

#### useActiveTeamMembers()

Fetches only active team members (for public-facing pages).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| data | TeamMember[] | Active team members only |
| isLoading | boolean | Loading state |
| error | Error \| null | Error object if query failed |

**Cache Settings**:
- Query Key: `['team-members', 'active']`
- Stale Time: 5 minutes

**Notes**:
- Filters `active: true` members
- Sorted by priority DESC, then created_at DESC

**Example**:
```typescript
// Public About page
const { data: activeMembers } = useActiveTeamMembers();

return (
  <section>
    <h2>Our Team</h2>
    <TeamGrid members={activeMembers} />
  </section>
);
```

---

### Mutation Hooks

#### useCreateTeamMember()

Creates a new team member (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (data: TeamMemberInsert) => void | Sync mutation function |
| mutateAsync | (data: TeamMemberInsert) => Promise<TeamMember> | Async mutation function |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Input Type**:
```typescript
type TeamMemberInsert = {
  name: string;
  role: string;
  bio?: string | null;
  avatar?: string | null;
  email?: string | null;
  skills: string[];
  social_links: TeamMemberSocialLinks;
  priority: number;
  active: boolean;
};
```

**Side Effects**:
- Invalidates `['team-members']` query on success

**Error Handling**:
- Throws error if user lacks admin permissions
- Validates email format (if provided)
- Validates social links URLs

**Example**:
```typescript
const { mutateAsync: createMember, isPending } = useCreateTeamMember();

const handleSubmit = async (formData: TeamMemberInsert) => {
  try {
    const newMember = await createMember(formData);
    toast.success(`Team member "${newMember.name}" created!`);
    navigate('/admin/team');
  } catch (error) {
    toast.error('Failed to create team member');
  }
};
```

---

#### useUpdateTeamMember()

Updates an existing team member (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (params) => void | Sync mutation function |
| mutateAsync | (params) => Promise<TeamMember> | Async mutation function |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Input Parameters**:
```typescript
{
  id: string;
  updates: Partial<TeamMember>; // All fields optional except id
}
```

**Side Effects**:
- Invalidates `['team-members']` query
- Invalidates `['team-members', id]` query

**Example**:
```typescript
const { mutateAsync: updateMember } = useUpdateTeamMember();

// Update role
await updateMember({
  id: memberId,
  updates: { role: 'Senior Developer' }
});

// Update social links
await updateMember({
  id: memberId,
  updates: {
    social_links: {
      ...member.social_links,
      github: 'https://github.com/username'
    }
  }
});
```

---

#### useDeleteTeamMember()

Deletes a team member (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (id: string) => void | Sync mutation function |
| mutateAsync | (id: string) => Promise<string> | Async mutation function (returns deleted ID) |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Side Effects**:
- Invalidates `['team-members']` query
- Returns the deleted member ID on success

**Example**:
```typescript
const { mutateAsync: deleteMember } = useDeleteTeamMember();

const handleDelete = async (memberId: string) => {
  if (!confirm('Delete this team member?')) return;

  try {
    await deleteMember(memberId);
    toast.success('Team member deleted');
  } catch (error) {
    toast.error('Failed to delete');
  }
};
```

---

#### useToggleTeamMemberActive()

Toggles a team member's active status (Admin only).

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| mutate | (params) => void | Sync mutation function |
| mutateAsync | (params) => Promise<TeamMember> | Async mutation function |
| isPending | boolean | Mutation in progress |
| isError | boolean | Mutation failed |
| error | Error \| null | Error object if mutation failed |

**Input Parameters**:
```typescript
{
  id: string;
  active: boolean;
}
```

**Side Effects**:
- Invalidates `['team-members']` query
- Invalidates `['team-members', id]` query
- Invalidates `['team-members', 'active']` query

**Example**:
```typescript
const { mutateAsync: toggleActive } = useToggleTeamMemberActive();

const handleToggle = async (member: TeamMember) => {
  await toggleActive({
    id: member.id,
    active: !member.active
  });
  toast.success(`Team member ${member.active ? 'deactivated' : 'activated'}`);
};
```

---

## Error Handling

**Common Error Scenarios**:
1. **Invalid email**: Validate email format before submission
2. **Invalid URLs**: Validate social link URLs (github, linkedin, twitter, website)
3. **Empty arrays**: Ensure `skills` array is not empty for meaningful profiles
4. **Avatar upload**: Handle avatar upload failures gracefully

**Email Validation Example**:
```typescript
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Before creating/updating
if (formData.email && !validateEmail(formData.email)) {
  toast.error('Invalid email format');
  return;
}
```

**URL Validation Example**:
```typescript
const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Validate social links
const validateSocialLinks = (links: TeamMemberSocialLinks): boolean => {
  const urls = Object.values(links).filter(Boolean);
  return urls.every(validateUrl);
};
```

---

## Cache Invalidation

Query cache is automatically invalidated after mutations:

| Mutation | Invalidated Queries |
|----------|---------------------|
| Create | `['team-members']` |
| Update | `['team-members']`, `['team-members', id]` |
| Delete | `['team-members']` |
| Toggle Active | `['team-members']`, `['team-members', id]`, `['team-members', 'active']` |

**Note**: Active members cache is only invalidated by `toggleActive`. Manually invalidate after updating `active` field via `updateMember`:

```typescript
const queryClient = useQueryClient();

await updateMember({ id, updates: { active: false } });
queryClient.invalidateQueries({ queryKey: ['team-members', 'active'] });
```

---

## Best Practices

### 1. Priority Management
Display members in priority order:

```typescript
const { data: members } = useTeamMembers();

// Members are pre-sorted by priority DESC, created_at DESC
// No additional sorting needed
return (
  <div>
    {members.map((member, index) => (
      <TeamMemberCard
        key={member.id}
        member={member}
        rank={index + 1} // Display rank
      />
    ))}
  </div>
);
```

### 2. Avatar Upload Integration
Handle avatar uploads with Supabase Storage:

```typescript
const uploadAvatar = async (file: File): Promise<string> => {
  const fileName = `avatars/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('team-avatars')
    .upload(fileName, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('team-avatars')
    .getPublicUrl(fileName);

  return publicUrl;
};

// In form
const handleAvatarChange = async (file: File) => {
  const avatarUrl = await uploadAvatar(file);
  setFormData({ ...formData, avatar: avatarUrl });
};
```

### 3. Social Links Component
Reusable social links display:

```typescript
const socialIcons = {
  github: GithubIcon,
  linkedin: LinkedinIcon,
  twitter: TwitterIcon,
  website: GlobeIcon
};

const SocialLinks = ({ links }: { links: TeamMemberSocialLinks }) => (
  <div className="social-links">
    {Object.entries(links).map(([platform, url]) => {
      if (!url) return null;
      const Icon = socialIcons[platform as keyof typeof socialIcons];
      return (
        <a
          key={platform}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={platform}
        >
          <Icon />
        </a>
      );
    })}
  </div>
);
```

### 4. Skills Tags
Display skills with autocomplete:

```typescript
const { data: allMembers } = useTeamMembers();

const allSkills = useMemo(() => {
  const skills = allMembers?.flatMap(m => m.skills) || [];
  return Array.from(new Set(skills)).sort();
}, [allMembers]);

const SkillsInput = ({ value, onChange }: {
  value: string[];
  onChange: (skills: string[]) => void;
}) => (
  <TagInput
    value={value}
    suggestions={allSkills}
    onChange={onChange}
    placeholder="Add skills..."
  />
);
```

### 5. Active Status Toggle
Quick toggle UI:

```typescript
const ActiveToggle = ({ member }: { member: TeamMember }) => {
  const { mutate: toggleActive, isPending } = useToggleTeamMemberActive();

  return (
    <Switch
      checked={member.active}
      onChange={() => toggleActive({ id: member.id, active: !member.active })}
      disabled={isPending}
      aria-label="Active status"
    />
  );
};
```

### 6. Team Member Card
Reusable card component:

```typescript
const TeamMemberCard = ({ member }: { member: TeamMember }) => (
  <div className="team-card">
    <img
      src={member.avatar || '/default-avatar.png'}
      alt={member.name}
      className="avatar"
    />
    <h3>{member.name}</h3>
    <p className="role">{member.role}</p>
    {member.bio && <p className="bio">{member.bio}</p>}
    <div className="skills">
      {member.skills.map(skill => (
        <span key={skill} className="skill-tag">{skill}</span>
      ))}
    </div>
    <SocialLinks links={member.social_links} />
  </div>
);
```

### 7. Priority Reordering
Drag-and-drop priority reordering:

```typescript
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext } from '@dnd-kit/sortable';

const TeamMembersReorder = () => {
  const { data: members } = useTeamMembers();
  const { mutateAsync: updateMember } = useUpdateTeamMember();

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id === over.id) return;

    const oldIndex = members.findIndex(m => m.id === active.id);
    const newIndex = members.findIndex(m => m.id === over.id);

    const reordered = arrayMove(members, oldIndex, newIndex);

    // Update priorities
    await Promise.all(
      reordered.map((member, index) =>
        updateMember({
          id: member.id,
          updates: { priority: reordered.length - index }
        })
      )
    );
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={members.map(m => m.id)}>
        {members.map(member => (
          <SortableTeamMemberCard key={member.id} member={member} />
        ))}
      </SortableContext>
    </DndContext>
  );
};
```

---

## Related Documentation

- [Team Member Type Definitions](d:\GitHub\idea-on-action\src\types\cms.types.ts)
- [Image Upload Guide](d:\GitHub\idea-on-action\docs\guides\file-upload.md)
- [Admin Team UI Guide](d:\GitHub\idea-on-action\docs\guides\cms\team.md)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [React Query Optimistic Updates](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
