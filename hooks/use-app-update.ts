import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

// GitHub repository info
const GITHUB_OWNER = 'REMSPERU';
const GITHUB_REPO = 'GT-CheckList-App';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

export interface AppUpdateInfo {
  needsUpdate: boolean;
  currentVersion: string;
  latestVersion: string | null;
  downloadUrl: string | null;
  releaseUrl: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * Compares two semver version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.replace('v', '').split('.').map(Number);
  const parts2 = v2.replace('v', '').split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * Hook to check for app updates via GitHub Releases API
 */
export function useAppUpdate(): AppUpdateInfo {
  const [state, setState] = useState<AppUpdateInfo>({
    needsUpdate: false,
    currentVersion: Constants.expoConfig?.version || '0.0.0',
    latestVersion: null,
    downloadUrl: null,
    releaseUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await fetch(GITHUB_API_URL, {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        });

        if (!response.ok) {
          // No releases yet or rate limited
          if (response.status === 404) {
            setState(prev => ({
              ...prev,
              isLoading: false,
              error: null,
            }));
            return;
          }
          throw new Error(`GitHub API error: ${response.status}`);
        }

        const release = await response.json();
        const latestVersion = release.tag_name?.replace('v', '') || null;

        // Find the APK asset
        const apkAsset = release.assets?.find((asset: any) =>
          asset.name.endsWith('.apk'),
        );

        const needsUpdate = latestVersion
          ? compareVersions(latestVersion, state.currentVersion) > 0
          : false;

        setState(prev => ({
          ...prev,
          latestVersion,
          downloadUrl: apkAsset?.browser_download_url || null,
          needsUpdate,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        console.error('Error checking for updates:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error ? error.message : 'Error checking updates',
        }));
      }
    };

    checkForUpdates();
  }, [state.currentVersion]);

  return state;
}

/**
 * Opens the download URL or releases page
 */
export async function openUpdateUrl(url: string): Promise<void> {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  } catch (error) {
    console.error('Error opening URL:', error);
  }
}
