import React from 'react';
import { Github, Linkedin, Twitter, Globe, Mail } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { TeamMember } from '@/types/cms/cms.types';

interface TeamMemberHoverCardProps {
  member: TeamMember;
  children: React.ReactNode;
}

/**
 * TeamMemberHoverCard - Displays rich team member info on hover
 *
 * Features:
 * - Profile photo with fallback initials
 * - Name, role, and bio
 * - Social links (GitHub, LinkedIn, Twitter, Website, Email)
 * - Skills badges
 * - 300ms hover delay for better UX
 * - Full accessibility with ARIA labels
 *
 * @example
 * <TeamMemberHoverCard member={teamMember}>
 *   <span className="font-medium hover:underline cursor-help">
 *     {teamMember.name}
 *   </span>
 * </TeamMemberHoverCard>
 */
export const TeamMemberHoverCard: React.FC<TeamMemberHoverCardProps> = ({
  member,
  children,
}) => {
  // Get initials from name (fallback for avatar)
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Social link icon mapping
  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'github':
        return Github;
      case 'linkedin':
        return Linkedin;
      case 'twitter':
        return Twitter;
      case 'website':
        return Globe;
      default:
        return Globe;
    }
  };

  // Filter out empty social links
  const socialLinks = Object.entries(member.socialLinks || {}).filter(
    ([_, url]) => url && url.trim() !== ''
  );

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-80" align="start">
        <div className="space-y-4">
          {/* Profile Header */}
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={member.avatar || undefined} alt={member.name} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-lg font-bold">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-semibold truncate">{member.name}</h4>
              <p className="text-sm text-muted-foreground">{member.role}</p>
            </div>
          </div>

          {/* Bio */}
          {member.bio && (
            <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
              {member.bio}
            </p>
          )}

          {/* Skills */}
          {member.skills && member.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {member.skills.slice(0, 5).map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                >
                  {skill}
                </span>
              ))}
              {member.skills.length > 5 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  +{member.skills.length - 5} more
                </span>
              )}
            </div>
          )}

          {/* Social Links & Email */}
          <div className="flex items-center gap-3 pt-2 border-t">
            {/* Email */}
            {member.email && (
              <a
                href={`mailto:${member.email}`}
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label={`Email ${member.name}`}
                title="Send email"
              >
                <Mail className="h-4 w-4" />
              </a>
            )}

            {/* Social Links */}
            {socialLinks.map(([platform, url]) => {
              const Icon = getSocialIcon(platform);
              const label = platform.charAt(0).toUpperCase() + platform.slice(1);

              return (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label={`${member.name}'s ${label}`}
                  title={label}
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}

            {/* Show placeholder if no links */}
            {socialLinks.length === 0 && !member.email && (
              <span className="text-xs text-muted-foreground">
                No contact info available
              </span>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
