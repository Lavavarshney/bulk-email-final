import React, { useState, useEffect, useRef } from "react";
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, 
  AlignRight, List, Link, Type, Quote, Code, Heading1, 
  Heading2, ListOrdered, Palette,Mail,Users,FileText,Send,Eye,Undo,Redo,Strikethrough,Indent,Outdent,Table,Subscript,Superscript,X,RemoveFormatting,Upload
,Check,Paperclip, Trash2} from "lucide-react";
import UsageStats from "./UsageStats";
import { useNavigate } from "react-router-dom";
const EnhancedEditor = ({ value, onChange }) => {
  const editorRef = useRef(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBackgroundColorPicker, setShowBackgroundColorPicker] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showFontFamily, setShowFontFamily] = useState(false);

  const colors = [
    '#000000', '#e60000', '#00a32a', '#0066cc', 
    '#666666', '#ff2600', '#00e635', '#0099ff'
  ];

  const fontSizes = [
    '8px', '10px', '12px', '14px', '16px', '18px', 
    '20px', '24px', '28px', '32px', '48px'
  ];

  const fontFamilies = [
    'Arial', 'Times New Roman', 'Courier New', 
    'Georgia', 'Verdana', 'Helvetica'
  ];

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.contentEditable = true;
      editorRef.current.designMode = "on";
    }
  }, []);

  const execCommand = (command, value = null) => {
    editorRef.current?.focus();
    try {
      if (command === 'formatBlock') {
        document.execCommand(command, false, `<${value}>`);
      } else {
        document.execCommand(command, false, value);
      }
    } catch (error) {
      console.error("Command execution failed", error);
    }
    onChange(editorRef.current.innerHTML);
  };

  const handleColorChange = (color) => {
    execCommand('foreColor', color);
    setShowColorPicker(false);
  };

  const handleBackgroundColorChange = (color) => {
    execCommand('hiliteColor', color);
    setShowBackgroundColorPicker(false);
  };

  const handleFontSizeChange = (size) => {
    execCommand('fontSize', size);
    setShowFontSize(false);
  };

  const handleFontFamilyChange = (font) => {
    execCommand('fontName', font);
    setShowFontFamily(false);
  };

  const handleLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const handleTable = () => {
    const rows = prompt('Enter number of rows:', '2');
    const cols = prompt('Enter number of columns:', '2');
    if (rows && cols) {
      let table = '<table border="1" style="width:100%">';
      for (let i = 0; i < parseInt(rows); i++) {
        table += '<tr>';
        for (let j = 0; j < parseInt(cols); j++) {
          table += '<td>Cell</td>';
        }
        table += '</tr>';
      }
      table += '</table>';
      execCommand('insertHTML', table);
    }
  };

  const toolbarButton = "p-2 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center";
  const dropdownMenu = "absolute z-50 mt-1 bg-white border rounded-lg shadow-lg p-2";

  return (
    <div className="border rounded-lg bg-white shadow-sm">
      <div className="border-b p-1 bg-gray-50 flex flex-wrap gap-1 items-center">
        {/* History Controls */}
        <div className="flex items-center border-r pr-1">
          <button onClick={() => execCommand('undo')} className={toolbarButton} title="Undo">
            <Undo className="w-4 h-4" />
          </button>
          <button onClick={() => execCommand('redo')} className={toolbarButton} title="Redo">
            <Redo className="w-4 h-4" />
          </button>
        </div>

        {/* Text Style Controls */}
        <div className="flex items-center border-r pr-1">
          <button onClick={() => execCommand('bold')} className={toolbarButton} title="Bold">
            <Bold className="w-4 h-4" />
          </button>
          <button onClick={() => execCommand('italic')} className={toolbarButton} title="Italic">
            <Italic className="w-4 h-4" />
          </button>
          <button onClick={() => execCommand('underline')} className={toolbarButton} title="Underline">
            <Underline className="w-4 h-4" />
          </button>
          <button onClick={() => execCommand('strikethrough')} className={toolbarButton} title="Strikethrough">
            <Strikethrough className="w-4 h-4" />
          </button>
        </div>

        {/* Font Controls */}
        <div className="flex items-center border-r pr-1">
          <div className="relative">
            <button onClick={() => setShowFontFamily(!showFontFamily)} className={toolbarButton} title="Font Family">
              <Type className="w-4 h-4" />
            </button>
            {showFontFamily && (
              <div className={dropdownMenu}>
                {fontFamilies.map((font) => (
                  <button
                    key={font}
                    onClick={() => handleFontFamilyChange(font)}
                    className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
                    style={{ fontFamily: font }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button onClick={() => setShowFontSize(!showFontSize)} className={toolbarButton} title="Font Size">
              <span className="text-sm">A</span>
            </button>
            {showFontSize && (
              <div className={dropdownMenu}>
                {fontSizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => handleFontSizeChange(size)}
                    className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
                  >
                    {size}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Color Controls */}
        <div className="flex items-center border-r pr-1">
          <div className="relative">
            <button onClick={() => setShowColorPicker(!showColorPicker)} className={toolbarButton} title="Text Color">
              <Palette className="w-4 h-4" />
            </button>
            {showColorPicker && (
              <div className="absolute z-50 mt-1 p-2 bg-white border rounded-lg shadow-lg grid grid-cols-4 gap-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color)}
                    className="w-6 h-6 rounded-full border"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowBackgroundColorPicker(!showBackgroundColorPicker)} 
              className={toolbarButton} 
              title="Background Color"
            >
              <span className="w-4 h-4 border flex items-center justify-center">BG</span>
            </button>
            {showBackgroundColorPicker && (
              <div className="absolute z-50 mt-1 p-2 bg-white border rounded-lg shadow-lg grid grid-cols-4 gap-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleBackgroundColorChange(color)}
                    className="w-6 h-6 rounded-full border"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Alignment Controls */}
        <div className="flex items-center border-r pr-1">
          <button onClick={() => execCommand('justifyLeft')} className={toolbarButton} title="Align Left">
            <AlignLeft className="w-4 h-4" />
          </button>
          <button onClick={() => execCommand('justifyCenter')} className={toolbarButton} title="Align Center">
            <AlignCenter className="w-4 h-4" />
          </button>
          <button onClick={() => execCommand('justifyRight')} className={toolbarButton} title="Align Right">
            <AlignRight className="w-4 h-4" />
          </button>
        </div>

        {/* List Controls */}
        <div className="flex items-center border-r pr-1">
          <button onClick={() => execCommand('insertUnorderedList')} className={toolbarButton} title="Bullet List">
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => execCommand('insertOrderedList')} className={toolbarButton} title="Numbered List">
            <ListOrdered className="w-4 h-4" />
          </button>
          <button onClick={() => execCommand('indent')} className={toolbarButton} title="Indent">
            <Indent className="w-4 h-4" />
          </button>
          <button onClick={() => execCommand('outdent')} className={toolbarButton} title="Outdent">
            <Outdent className="w-4 h-4" />
          </button>
        </div>

        {/* Additional Controls */}
        <div className="flex items-center">
          <button onClick={handleLink} className={toolbarButton} title="Insert Link">
            <Link className="w-4 h-4" />
          </button>
          <button onClick={handleTable} className={toolbarButton} title="Insert Table">
            <Table className="w-4 h-4" />
          </button>
          <button onClick={() => execCommand('subscript')} className={toolbarButton} title="Subscript">
            <Subscript className="w-4 h-4" />
          </button>
          <button onClick={() => execCommand('superscript')} className={toolbarButton} title="Superscript">
            <Superscript className="w-4 h-4" />
          </button>
          <button onClick={() => execCommand('removeFormat')} className={toolbarButton} title="Clear Formatting">
            <RemoveFormatting className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={editorRef}
        className="p-4 min-h-[200px] prose prose-sm max-w-none focus:outline-none"
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
      />
    </div>
  );
};

const Demo = () => {
  const [recipients, setRecipients] = useState([]);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [scheduleEmail, setScheduleEmail] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showOptOutPreview, setShowOptOutPreview] = useState(true);
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('manual');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewRecipient, setPreviewRecipient] = useState(null);
  const[subject,setSubject] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState(''); // State for checkout URL
  const [showCheckoutButton, setShowCheckoutButton] = useState(false); // State to show/hide button
const navigate=useNavigate();
  // Handle rich text editor change
  const handleEditorChange = (content) => {
    setEmailContent(content);
  };

  const getCompleteEmailContent = () => emailContent;
  
  // Validation function for emails
  const validateEmail = (email) => {
    return email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  // Parsing input for manual email entries
  const parseManualInput = (input) => {
    const entries = input.split(',').map(entry => entry.trim());
    const parsed = entries.map(entry => {
      const parts = entry.split(/[<>]/).map(part => part.trim());
      return parts.length === 1 
        ? { email: parts[0], name: '' }
        : { name: parts[0], email: parts[1] || parts[0] };
    });
    
    const validEntries = parsed.filter(({ email }) => validateEmail(email));
    setError(validEntries.length !== parsed.length 
      ? 'Some email addresses were invalid and have been removed' 
      : '');
    
    return validEntries;
  };

  // Handle manual input changes
  const handleManualInputChange = (e) => {
    const value = e.target.value.trim();
    setManualInput(value);
    setRecipients(parseManualInput(value));
  };

  // Handle file input change for CSV upload
  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);
    setIsUploading(true);
    setManualInput('');
  };

  // Handle form submission for uploading
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setStatus("Please select a file to upload.");
      return;
    }

    setIsUploading(true);
    setStatus("Uploading...");
    const formData = new FormData();
    if (file) {
      formData.append("csvFile", file, file.name);
    } else {
      console.error("No CSV file selected!");
    }
    formData.append("scheduleEmail", scheduleEmail);
    formData.append("scheduleTime", scheduleTime);
    formData.append("emailContent", getCompleteEmailContent());
    console.log("file",file);
   /* Append attachments
   attachments.forEach((attachment) => {
    formData.append("attachments", attachment); // Use the same key for multiple attachments
  });*/
 console.log(formData);
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/upload-csv`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });
    console.log(response.body)
      const result = await response.json();
      console.log(response.status)
      setStatus(response.ok ? "File uploaded successfully!" : `Error: ${result.message}`);
     alert("Email sent successfully");
    } catch (error) {
      console.error("Error uploading file:", error);
      setStatus("Failed to upload file.");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle email sending
  const handleSendEmails = async () => {
    if (recipients.length === 0) {
      setError('No recipients to send emails.');
      return;
    }

    setError('');
    const token = localStorage.getItem("token");
    console.log(token);
     // Prepare the attachment details

  // Append attachment details to the email content
  const completeEmailContent = `${getCompleteEmailContent()}`;
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/send-manual-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          emailList: recipients,
          scheduleEmail,
          scheduleTime,
         // subject, // Add subject here
          emailContent: getCompleteEmailContent(),
        }),
      });

      if (response.ok) {
        alert("Emails sent successfully!");
        console.log("subject",subject);
      fetchUserData();
      }
      else if (response.status === 402) {
        const data = await response.json();
        setCheckoutUrl(data.checkoutUrl); // Set the checkout URL from the response
        setShowCheckoutButton(true); // Show the checkout button
       setTimeout(fetchUserData,5000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to send emails. Please try again');
      }
    } catch (error) {
      console.error(error);
      setError('Failed to send emails. Please try again');
    }
  };
  const fetchUserData = async () => {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/current-user`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }
    });
    const data = await response.json();
    setUser(data);  // ✅ Update user state
  };
  // Preview Modal
  const handlePreviewClick = () => {
    const previewRecipient = recipients.length > 0 
      ? recipients[0] 
      : { name: 'John Doe', email: 'example@email.com' };
    
    setPreviewRecipient(previewRecipient);
    setIsPreviewOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="py-8">
        <div className="max-w-4xl mx-auto px-4 space-y-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Mail className="w-5 h-5 text-gray-500" />
                <h1 className="text-xl font-semibold">Email Campaign</h1>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Recipients Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Recipients</h3>

                {/* Custom Tabs */}
                <div className="border-b border-gray-200">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setActiveTab('manual')}
                      className={`px-4 py-2 flex items-center space-x-2 border-b-2 ${
                        activeTab === 'manual' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>Manual Input</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('csv')}
                      className={`px-4 py-2 flex items-center space-x-2 border-b-2 ${
                        activeTab === 'csv' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>CSV Upload</span>
                    </button>
                  </div>
                </div>
                
                <div className="mt-4">
                  {activeTab === 'manual' && (
                    <div className="space-y-4">
                                        <input
  type="text"
  value={subject}
  onChange={(e) => setSubject(e.target.value)}
  placeholder="Enter email subject"
  className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
/>
                      <textarea
                        value={manualInput}
                        onChange={handleManualInputChange}
                        placeholder="Enter emails separated by commas or in format: Name <email@example.com>"
                        rows={4}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {recipients.length > 0 && (
                        <div className="text-sm text-gray-600">
                          {recipients.length} valid recipient(s)
                        </div>
                      )}
                    
                    </div>
                     
                  )}

                  {activeTab === 'csv' && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {!isUploading ? (
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
          ) : (
            <Check className="mx-auto h-12 w-12 text-green-600" />
          )} 
                      <div className="mt-4">
                  
                        <input
                          type="file"
                          name="csvFile"
                          onChange={handleFileChange}
                          className="hidden"
                          id="file-upload"
                          accept=".csv"
                        />
                        {!isUploading?(
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Select CSV File
                        </label>
                        ):
                        <label
                        htmlFor="file-upload"
                        className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Selected CSV File
                      </label>}
                      </div>
                     
                    </div>
                  )}
                </div>
              </div>

              {/* Email Content */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Email Content</h3>
                <div className="space-y-4">
                  <EnhancedEditor onChange={handleEditorChange} />
                </div>
              </div>

              {/* Scheduling */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Schedule Email</h3>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={scheduleEmail}
                      onChange={() => setScheduleEmail(prev => !prev)}
                      className="mr-2"
                    />
                    Schedule for later
                  </label>

                  {scheduleEmail && (
                    <div className="mt-4">
                      <label htmlFor="schedule-time" className="block">Select Time</label>
                      <input
                        type="datetime-local"
                        id="schedule-time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-md"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-4">
              {activeTab === 'csv'?(<button
                  type="button"
                  onClick={handleSubmit}
                  className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Send Emails
                </button>):(<button
                      type="button"
                      onClick={handleSendEmails}
                      className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                    >
                      <Send className="w-5 h-5 mr-2" />
                      Send Emails
                    </button>)}
                    {error && <p style={{ color: 'red' }}>{ error}</p>}
              {showCheckoutButton && (
                
               navigate('/payment')
                 
                
              )}
                {/* Modal Preview Trigger */}
                <button
                  type="button"
                  onClick={handlePreviewClick}
                  className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-600 bg-white hover:bg-indigo-100"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      {isPreviewOpen && previewRecipient && (
        <div className="fixed inset-0 flex items-center justify-center z-10 bg-gray-900 bg-opacity-50">
          <div className="bg-white p-8 rounded-lg w-96">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Preview Email</h3>
              <button onClick={() => setIsPreviewOpen(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="mt-4">
              <div><strong>Recipient:</strong> {previewRecipient.name || previewRecipient.email}</div>
              <div><strong>Email:</strong> {previewRecipient.email}</div>
              <div className="mt-4"><strong>Email Content:</strong></div>
              <div dangerouslySetInnerHTML={{ __html: getCompleteEmailContent() }} className="mt-2" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Demo;
