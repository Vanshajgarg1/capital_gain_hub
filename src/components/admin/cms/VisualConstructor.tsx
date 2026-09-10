"use client";

import React, { useState, useEffect } from "react";
import { CmsPage, CmsPageSlug, CmsSection } from "@/types/cms";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Save, Globe, Plus, Trash2, ArrowUp, ArrowDown, Settings, LayoutTemplate, 
  Eye, EyeOff, Loader2 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`
    }
  });
};

const SECTION_TYPES = ["hero", "text", "features", "cta", "image", "video", "faq", "testimonials"];

export function VisualConstructor() {
  const [activeSlug, setActiveSlug] = useState<CmsPageSlug>("home");
  const [pageData, setPageData] = useState<Partial<CmsPage>>({});
  const [sections, setSections] = useState<CmsSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadPage(activeSlug);
  }, [activeSlug]);

  const loadPage = async (slug: CmsPageSlug) => {
    setLoading(true);
    setDirty(false);
    try {
      const res = await fetchWithAuth(`/api/admin/website/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setPageData({
          title: data.title || "",
          seo_title: data.seo_title || "",
          seo_description: data.seo_description || "",
          is_published: data.is_published || false,
        });
        setSections(data.sections || []);
      } else if (res.status === 404) {
        // Page doesn't exist yet, init defaults
        setPageData({
          title: slug.charAt(0).toUpperCase() + slug.slice(1),
          seo_title: "",
          seo_description: "",
          is_published: false,
        });
        setSections([]);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSave = async (publish?: boolean) => {
    setSaving(true);
    try {
      const isPublished = publish !== undefined ? publish : pageData.is_published;
      
      // Save page
      const pageRes = await fetchWithAuth(`/api/admin/website/${activeSlug}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: pageData.title,
          seo_title: pageData.seo_title,
          seo_description: pageData.seo_description,
          is_published: isPublished,
        })
      });

      if (!pageRes.ok && pageRes.status === 404) {
        // Create instead
        await fetchWithAuth(`/api/admin/website`, {
          method: "POST",
          body: JSON.stringify({
            slug: activeSlug,
            title: pageData.title,
            seo_title: pageData.seo_title,
            seo_description: pageData.seo_description,
            is_published: isPublished,
          })
        });
      }

      // Save sections
      const sectionsToSave = sections.map((s, i) => ({
        id: s.id.startsWith("new-") ? undefined : s.id,
        section_type: s.section_type,
        content: s.content,
        order_index: i,
        is_visible: s.is_visible
      }));

      const secRes = await fetchWithAuth(`/api/admin/website/${activeSlug}/sections`, {
        method: "PUT",
        body: JSON.stringify(sectionsToSave)
      });

      if (secRes.ok) {
        const updatedSecs = await secRes.json();
        setSections(updatedSecs.sections || []);
        setPageData(prev => ({ ...prev, is_published: isPublished }));
        setDirty(false);
        alert(publish ? "Published successfully!" : "Saved successfully!");
      } else {
        alert("Error saving sections.");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while saving.");
    }
    setSaving(false);
  };

  const addSection = (type: string) => {
    const newSection: CmsSection = {
      id: `new-${Date.now()}`,
      page_id: "",
      section_type: type,
      content: {},
      order_index: sections.length,
      is_visible: true,
      created_at: "",
      updated_at: ""
    };
    setSections([...sections, newSection]);
    setDirty(true);
  };

  const updateSectionContent = (index: number, key: string, value: any) => {
    const updated = [...sections];
    updated[index].content = { ...updated[index].content, [key]: value };
    setSections(updated);
    setDirty(true);
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;
    
    const updated = [...sections];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[targetIdx]] = [updated[targetIdx], updated[index]];
    setSections(updated);
    setDirty(true);
  };

  const toggleVisibility = (index: number) => {
    const updated = [...sections];
    updated[index].is_visible = !updated[index].is_visible;
    setSections(updated);
    setDirty(true);
  };

  const deleteSection = (index: number) => {
    if (confirm("Are you sure you want to delete this section?")) {
      const updated = [...sections];
      updated.splice(index, 1);
      setSections(updated);
      setDirty(true);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Controls */}
      <div className="w-full lg:w-1/4 space-y-6">
        <div className="glass-card p-6 rounded-2xl border border-white/10 bg-black/40">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-500" /> Pages
          </h3>
          <div className="space-y-2">
            {(["home", "about", "terms"] as CmsPageSlug[]).map(slug => (
              <button
                key={slug}
                onClick={() => setActiveSlug(slug)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                  activeSlug === slug 
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                    : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white border border-transparent"
                }`}
              >
                {slug.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-white/10 bg-black/40 space-y-4">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-purple-500" /> Page Settings
          </h3>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Internal Title</label>
            <Input 
              value={pageData.title || ""} 
              onChange={e => { setPageData(p => ({...p, title: e.target.value})); setDirty(true); }}
              className="bg-black border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">SEO Title</label>
            <Input 
              value={pageData.seo_title || ""} 
              onChange={e => { setPageData(p => ({...p, seo_title: e.target.value})); setDirty(true); }}
              className="bg-black border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">SEO Description</label>
            <Textarea 
              value={pageData.seo_description || ""} 
              onChange={e => { setPageData(p => ({...p, seo_description: e.target.value})); setDirty(true); }}
              className="bg-black border-white/10 text-white min-h-[100px]"
            />
          </div>
        </div>
      </div>

      {/* Main Editor */}
      <div className="w-full lg:w-3/4 space-y-6">
        <div className="glass-card p-6 rounded-2xl border border-white/10 bg-black/40 flex items-center justify-between sticky top-4 z-50 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <LayoutTemplate className="w-6 h-6 text-cyan-400" /> 
              {activeSlug} Editor
            </h2>
            {dirty && <span className="text-amber-500 text-xs font-bold uppercase px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full animate-pulse">Unsaved Changes</span>}
            {pageData.is_published ? (
              <span className="text-emerald-500 text-xs font-bold uppercase px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">Live</span>
            ) : (
              <span className="text-muted-foreground text-xs font-bold uppercase px-2 py-1 bg-white/10 border border-white/20 rounded-full">Draft</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => handleSave(false)}
              disabled={saving}
              className="border-white/10 hover:bg-white/10"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Draft
            </Button>
            <Button 
              onClick={() => handleSave(true)}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
              Publish Live
            </Button>
            {pageData.is_published && (
              <Button 
                variant="destructive" 
                onClick={() => {
                  if(confirm("Unpublish this page?")) handleSave(false);
                }}
                disabled={saving}
                className="bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50"
              >
                Unpublish
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-20 glass-card rounded-2xl border border-white/10">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {sections.map((section, index) => (
                <motion.div 
                  key={section.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`glass-card rounded-2xl border ${section.is_visible ? 'border-white/10 bg-white/5' : 'border-white/5 bg-black/60 opacity-60'} overflow-hidden transition-all duration-300`}
                >
                  <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-[10px] text-muted-foreground bg-white/10 px-2 py-1 rounded">#{index + 1}</div>
                      <span className="font-bold text-sm uppercase tracking-wider text-cyan-400">{section.section_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => moveSection(index, 'up')} disabled={index === 0} className="h-8 w-8 hover:bg-white/10"><ArrowUp className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => moveSection(index, 'down')} disabled={index === sections.length - 1} className="h-8 w-8 hover:bg-white/10"><ArrowDown className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleVisibility(index)} className="h-8 w-8 hover:bg-white/10">
                        {section.is_visible ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteSection(index)} className="h-8 w-8 hover:bg-red-500/20 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <div className="p-6">
                    <SectionEditor 
                      section={section} 
                      onChange={(k, v) => updateSectionContent(index, k, v)} 
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {SECTION_TYPES.map(type => (
                <Button 
                  key={type} 
                  variant="outline" 
                  className="border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 h-12"
                  onClick={() => addSection(type)}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add {type}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component for editing specific section JSON structures
function SectionEditor({ section, onChange }: { section: CmsSection, onChange: (key: string, value: any) => void }) {
  const { content, section_type } = section;
  
  if (section_type === 'hero') {
    return (
      <div className="space-y-4">
        <Input placeholder="Headline" value={content.headline || ""} onChange={e => onChange('headline', e.target.value)} className="bg-black/50 text-xl font-bold h-14" />
        <Textarea placeholder="Subheadline" value={content.subheadline || ""} onChange={e => onChange('subheadline', e.target.value)} className="bg-black/50" />
        <div className="grid grid-cols-2 gap-4">
          <Input placeholder="Primary CTA Text" value={content.primary_cta_text || ""} onChange={e => onChange('primary_cta_text', e.target.value)} className="bg-black/50" />
          <Input placeholder="Primary CTA URL" value={content.primary_cta_url || ""} onChange={e => onChange('primary_cta_url', e.target.value)} className="bg-black/50" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input placeholder="Secondary CTA Text" value={content.secondary_cta_text || ""} onChange={e => onChange('secondary_cta_text', e.target.value)} className="bg-black/50" />
          <Input placeholder="Secondary CTA URL" value={content.secondary_cta_url || ""} onChange={e => onChange('secondary_cta_url', e.target.value)} className="bg-black/50" />
        </div>
        <Input placeholder="Background Image URL (optional)" value={content.background_image || ""} onChange={e => onChange('background_image', e.target.value)} className="bg-black/50" />
      </div>
    );
  }

  if (section_type === 'text') {
    return (
      <div className="space-y-4">
        <Input placeholder="Heading (optional)" value={content.heading || ""} onChange={e => onChange('heading', e.target.value)} className="bg-black/50 text-lg font-bold" />
        <Textarea placeholder="HTML Body Content" value={content.body || ""} onChange={e => onChange('body', e.target.value)} className="bg-black/50 min-h-[200px] font-mono text-sm" />
      </div>
    );
  }

  if (section_type === 'cta') {
    return (
      <div className="space-y-4">
        <Input placeholder="Heading" value={content.heading || ""} onChange={e => onChange('heading', e.target.value)} className="bg-black/50 text-lg font-bold" />
        <Textarea placeholder="Description" value={content.description || ""} onChange={e => onChange('description', e.target.value)} className="bg-black/50" />
        <div className="grid grid-cols-2 gap-4">
          <Input placeholder="Button Text" value={content.button_text || ""} onChange={e => onChange('button_text', e.target.value)} className="bg-black/50" />
          <Input placeholder="Button URL" value={content.button_url || ""} onChange={e => onChange('button_url', e.target.value)} className="bg-black/50" />
        </div>
      </div>
    );
  }

  if (section_type === 'image') {
    return (
      <div className="space-y-4">
        <Input placeholder="Image URL" value={content.image_url || ""} onChange={e => onChange('image_url', e.target.value)} className="bg-black/50" />
        <Input placeholder="Alt Text" value={content.alt_text || ""} onChange={e => onChange('alt_text', e.target.value)} className="bg-black/50" />
        <Input placeholder="Caption (optional)" value={content.caption || ""} onChange={e => onChange('caption', e.target.value)} className="bg-black/50" />
      </div>
    );
  }

  if (section_type === 'video') {
    return (
      <div className="space-y-4">
        <Input placeholder="Video Title (optional)" value={content.title || ""} onChange={e => onChange('title', e.target.value)} className="bg-black/50" />
        <Input placeholder="Video Embed URL (e.g. YouTube iframe src)" value={content.video_url || ""} onChange={e => onChange('video_url', e.target.value)} className="bg-black/50" />
      </div>
    );
  }

  if (section_type === 'features') {
    const items = content.items || [];
    return (
      <div className="space-y-4">
        <Input placeholder="Section Heading" value={content.heading || ""} onChange={e => onChange('heading', e.target.value)} className="bg-black/50 text-lg font-bold" />
        <div className="space-y-3 pl-4 border-l-2 border-white/10">
          {items.map((item: any, i: number) => (
            <div key={i} className="flex gap-2 items-start relative group">
              <div className="flex-1 space-y-2">
                <Input placeholder="Feature Title" value={item.title || ""} onChange={e => {
                  const newItems = [...items]; newItems[i].title = e.target.value; onChange('items', newItems);
                }} className="bg-black/50" />
                <Textarea placeholder="Description" value={item.description || ""} onChange={e => {
                  const newItems = [...items]; newItems[i].description = e.target.value; onChange('items', newItems);
                }} className="bg-black/50" />
              </div>
              <Button variant="ghost" size="icon" onClick={() => {
                const newItems = [...items]; newItems.splice(i, 1); onChange('items', newItems);
              }} className="text-red-500 hover:bg-red-500/20"><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => onChange('items', [...items, { title: "", description: "" }])} className="mt-2">
            <Plus className="w-3 h-3 mr-2" /> Add Feature
          </Button>
        </div>
      </div>
    );
  }

  if (section_type === 'faq') {
    const items = content.items || [];
    return (
      <div className="space-y-4">
        <Input placeholder="Section Heading" value={content.heading || ""} onChange={e => onChange('heading', e.target.value)} className="bg-black/50 text-lg font-bold" />
        <div className="space-y-3 pl-4 border-l-2 border-white/10">
          {items.map((item: any, i: number) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 space-y-2">
                <Input placeholder="Question" value={item.question || ""} onChange={e => {
                  const newItems = [...items]; newItems[i].question = e.target.value; onChange('items', newItems);
                }} className="bg-black/50" />
                <Textarea placeholder="Answer" value={item.answer || ""} onChange={e => {
                  const newItems = [...items]; newItems[i].answer = e.target.value; onChange('items', newItems);
                }} className="bg-black/50" />
              </div>
              <Button variant="ghost" size="icon" onClick={() => {
                const newItems = [...items]; newItems.splice(i, 1); onChange('items', newItems);
              }} className="text-red-500 hover:bg-red-500/20"><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => onChange('items', [...items, { question: "", answer: "" }])} className="mt-2">
            <Plus className="w-3 h-3 mr-2" /> Add FAQ
          </Button>
        </div>
      </div>
    );
  }

  if (section_type === 'testimonials') {
    const items = content.items || [];
    return (
      <div className="space-y-4">
        <Input placeholder="Section Heading" value={content.heading || ""} onChange={e => onChange('heading', e.target.value)} className="bg-black/50 text-lg font-bold" />
        <div className="space-y-3 pl-4 border-l-2 border-white/10">
          {items.map((item: any, i: number) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 space-y-2">
                <Input placeholder="Student Name" value={item.name || ""} onChange={e => {
                  const newItems = [...items]; newItems[i].name = e.target.value; onChange('items', newItems);
                }} className="bg-black/50" />
                <Input placeholder="Role (e.g. Student)" value={item.role || ""} onChange={e => {
                  const newItems = [...items]; newItems[i].role = e.target.value; onChange('items', newItems);
                }} className="bg-black/50" />
                <Textarea placeholder="Quote" value={item.quote || ""} onChange={e => {
                  const newItems = [...items]; newItems[i].quote = e.target.value; onChange('items', newItems);
                }} className="bg-black/50" />
              </div>
              <Button variant="ghost" size="icon" onClick={() => {
                const newItems = [...items]; newItems.splice(i, 1); onChange('items', newItems);
              }} className="text-red-500 hover:bg-red-500/20"><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => onChange('items', [...items, { name: "", role: "", quote: "" }])} className="mt-2">
            <Plus className="w-3 h-3 mr-2" /> Add Testimonial
          </Button>
        </div>
      </div>
    );
  }

  // Fallback for unknown JSON structures
  return (
    <div className="space-y-2">
      <Textarea 
        value={JSON.stringify(content, null, 2)} 
        onChange={e => {
          try { onChange('RAW', JSON.parse(e.target.value)); } catch(e) {}
        }}
        className="font-mono text-xs h-32 bg-black/50" 
      />
    </div>
  );
}
