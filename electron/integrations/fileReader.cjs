/**
 * File Reader Integration
 * 
 * Reads markdown files from local repositories (gitcoin, notes).
 * Supports frontmatter parsing via gray-matter.
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const matter = require('gray-matter');

/**
 * Check if a directory exists
 */
async function directoryExists(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a file exists
 */
async function fileExists(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Read a markdown file and parse its frontmatter
 * @param {string} filePath - Absolute path to the markdown file
 * @returns {Promise<{frontmatter: object, body: string, path: string}>}
 */
async function readMarkdownFile(filePath) {
  try {
    // Validate path exists
    if (!await fileExists(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Validate it's a markdown file
    if (!filePath.endsWith('.md') && !filePath.endsWith('.mdx')) {
      throw new Error(`Not a markdown file: ${filePath}`);
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);
    
    return {
      frontmatter,
      body,
      path: filePath,
      name: path.basename(filePath, path.extname(filePath)),
      modifiedAt: (await fs.stat(filePath)).mtime.toISOString(),
    };
  } catch (error) {
    console.error(`Error reading markdown file ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * List all markdown files in a directory
 * @param {string} directory - Directory to scan
 * @param {boolean} recursive - Whether to scan subdirectories
 * @returns {Promise<string[]>} - Array of file paths
 */
async function listMarkdownFiles(directory, recursive = true) {
  const files = [];

  // Validate directory exists
  if (!await directoryExists(directory)) {
    console.warn(`Directory not found: ${directory}`);
    return files;
  }

  async function scan(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip hidden files and directories
        if (entry.name.startsWith('.')) {
          continue;
        }

        // Skip common non-content directories
        if (entry.isDirectory() && ['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
          continue;
        }

        if (entry.isDirectory() && recursive) {
          await scan(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error.message);
    }
  }

  await scan(directory);
  return files;
}

/**
 * Read all project files from the notes repo
 * @param {string} notesRepoPath - Path to the notes repository
 * @returns {Promise<Array>} - Array of project objects
 */
async function readProjectFiles(notesRepoPath) {
  if (!notesRepoPath) {
    console.warn('Notes repo path not configured');
    return [];
  }

  const projectsDir = path.join(notesRepoPath, 'Projects');
  
  if (!await directoryExists(projectsDir)) {
    console.warn(`Projects directory not found: ${projectsDir}`);
    return [];
  }

  const files = await listMarkdownFiles(projectsDir);

  const projects = await Promise.all(
    files.map(async (filePath) => {
      try {
        const { frontmatter, body, name, modifiedAt } = await readMarkdownFile(filePath);
        
        // Extract first 200 chars as excerpt, stripping markdown formatting
        const cleanBody = body
          .replace(/^#+\s+.*/gm, '') // Remove headers
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text
          .replace(/[*_`]/g, '') // Remove bold/italic/code markers
          .trim();
        
        const excerpt = cleanBody.slice(0, 200) + (cleanBody.length > 200 ? '...' : '');

        return {
          path: filePath,
          name,
          excerpt,
          modifiedAt,
          ...frontmatter,
        };
      } catch (error) {
        console.error(`Error reading project file ${filePath}:`, error.message);
        return null;
      }
    })
  );

  // Filter out failed reads and sort by modified date
  return projects
    .filter(Boolean)
    .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
}

/**
 * Read all notes files from the notes repo
 * @param {string} notesRepoPath - Path to the notes repository
 * @param {string} subDirectory - Optional subdirectory within notes repo
 * @returns {Promise<Array>} - Array of note objects
 */
async function readNotesFiles(notesRepoPath, subDirectory = '') {
  if (!notesRepoPath) {
    console.warn('Notes repo path not configured');
    return [];
  }

  const notesDir = subDirectory 
    ? path.join(notesRepoPath, subDirectory)
    : notesRepoPath;
  
  if (!await directoryExists(notesDir)) {
    console.warn(`Notes directory not found: ${notesDir}`);
    return [];
  }

  const files = await listMarkdownFiles(notesDir);

  const notes = await Promise.all(
    files.map(async (filePath) => {
      try {
        const { frontmatter, body, name, modifiedAt } = await readMarkdownFile(filePath);
        
        // Get relative path from notes root
        const relativePath = path.relative(notesRepoPath, filePath);
        
        // Extract first 150 chars as excerpt
        const cleanBody = body
          .replace(/^#+\s+.*/gm, '')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/[*_`]/g, '')
          .trim();
        
        const excerpt = cleanBody.slice(0, 150) + (cleanBody.length > 150 ? '...' : '');

        return {
          path: filePath,
          relativePath,
          name,
          excerpt,
          modifiedAt,
          ...frontmatter,
        };
      } catch (error) {
        console.error(`Error reading notes file ${filePath}:`, error.message);
        return null;
      }
    })
  );

  return notes
    .filter(Boolean)
    .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
}

/**
 * Search for files matching a query
 * @param {string} directory - Directory to search
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of matching files
 */
async function searchFiles(directory, query) {
  if (!directory || !query) {
    return [];
  }

  const files = await listMarkdownFiles(directory);
  const queryLower = query.toLowerCase();
  
  const results = await Promise.all(
    files.map(async (filePath) => {
      try {
        const { frontmatter, body, name, modifiedAt } = await readMarkdownFile(filePath);
        
        // Search in filename, frontmatter title, and body
        const titleMatch = (frontmatter.title || name).toLowerCase().includes(queryLower);
        const bodyMatch = body.toLowerCase().includes(queryLower);
        const tagsMatch = (frontmatter.tags || []).some(tag => 
          tag.toLowerCase().includes(queryLower)
        );
        
        if (titleMatch || bodyMatch || tagsMatch) {
          return {
            path: filePath,
            name,
            title: frontmatter.title || name,
            excerpt: body.slice(0, 150) + '...',
            modifiedAt,
            matchType: titleMatch ? 'title' : tagsMatch ? 'tags' : 'body',
            ...frontmatter,
          };
        }
        
        return null;
      } catch {
        return null;
      }
    })
  );

  return results.filter(Boolean);
}

/**
 * Get file stats
 * @param {string} filePath - Path to the file
 * @returns {Promise<object>} - File stats
 */
async function getFileStats(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      path: filePath,
      name: path.basename(filePath),
      size: stats.size,
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString(),
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
    };
  } catch (error) {
    console.error(`Error getting file stats for ${filePath}:`, error.message);
    throw error;
  }
}

module.exports = {
  readMarkdownFile,
  listMarkdownFiles,
  readProjectFiles,
  readNotesFiles,
  searchFiles,
  getFileStats,
  directoryExists,
  fileExists,
};
